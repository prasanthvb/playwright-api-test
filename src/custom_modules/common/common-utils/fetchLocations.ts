/**
 * fetchLocations.ts
 *
 * Fetches one real random US address per active state by calling:
 *   POST https://cleverutils.com/random-address
 *   Body: state=<CODE>&count=50
 *
 * The HTML response contains address cards with the structure:
 *
 *   <div class="card mb-3">
 *     <div class="p-4">
 *       <h5 class="font-semibold mb-3 heading-3">
 *         412 Highway 5, Rose Bud, AR 72137-9409
 *       </h5>
 *       <div>
 *         <div>City: Rose Bud</div>
 *         <div>County: White</div>
 *         <div>State: Arkansas (AR)</div>
 *         ...
 *       </div>
 *     </div>
 *   </div>
 *
 * This module parses that HTML with regex (no browser/DOM needed — runs in Node)
 * and returns ONE LocationEntry per state, picked randomly from the results.
 */

import https from 'https';
import { LocationEntry } from './locationData';
import { AVAILABLE_STATES } from './availableStates';

// ─── HTTP POST helper (native Node — no extra deps) ──────────────────────────

function httpPost(url: string, body: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body),
        'User-Agent': 'Mozilla/5.0 (playwright-api-test)',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk: Buffer) => (data += chunk.toString()));
      res.on('end', () => resolve(data));
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ─── HTML card parser ─────────────────────────────────────────────────────────

interface RawAddressCard {
  streetLine: string; // full title: "4951 Park Ave, Hot Springs, AR 71901-9478"
  addressLine1: string; // street only: "4951 Park Ave"
  city: string;
  county: string;
  state: string; // two-letter code: "AR"
  postalCode: string; // base ZIP (5 digits): "71901"
}

/**
 * Extract all address cards from the HTML returned by cleverutils.com.
 * Each card looks like:
 *
 *   <div class="card mb-3">
 *     <div class="p-4">
 *       <h5 ...>STREET, CITY, STATE ZIP+4</h5>
 *       <div>
 *         <div>City: CITY</div>
 *         <div>County: COUNTY</div>
 *         <div>State: FULLNAME (CODE)</div>
 *         ...
 *       </div>
 *     </div>
 *   </div>
 */
function parseAddressCards(html: string): RawAddressCard[] {
  const results: RawAddressCard[] = [];

  // Split on card boundaries so we process one card at a time
  const cardChunks = html.split('<div class="card mb-3">');
  // index 0 is everything before the first card — skip it
  for (let i = 1; i < cardChunks.length; i++) {
    const chunk = cardChunks[i];

    // City: <div>City: VALUE</div>
    const cityMatch = chunk.match(/City:\s*([^<]+)<\/div>/);
    // County: <div>County: VALUE</div>
    const countyMatch = chunk.match(/County:\s*([^<]+)<\/div>/);
    // State: <div>State: Full Name (CODE)</div>
    const stateMatch = chunk.match(/State:\s*[^(]+\(([A-Z]{2})\)/);
    // Street title: <h5 ...>STREET, CITY, STATE ZIP+4</h5>
    const titleMatch = chunk.match(/<h5[^>]*>([^<]+)<\/h5>/);

    if (!cityMatch || !countyMatch || !stateMatch || !titleMatch) continue;

    const city = cityMatch[1].trim();
    const county = countyMatch[1].trim();
    const stateCode = stateMatch[1].trim();
    const streetLine = titleMatch[1].trim();

    // Extract the base 5-digit ZIP from the title line  e.g. "72137-9409" → "72137"
    const zipMatch = streetLine.match(/\b(\d{5})(?:-\d{4})?\b/);
    const postalCode = zipMatch ? zipMatch[1] : '';

    // Extract the street address portion — everything before ", CITY, STATE ZIP"
    // Title format: "4951 Park Ave, Hot Springs, AR 71901-9478"
    // Split on ", " and drop the last two segments ("Hot Springs" and "AR 71901-9478").
    const titleParts = streetLine.split(', ');
    const addressLine1 = titleParts
      .slice(0, titleParts.length - 2)
      .join(', ')
      .trim();

    if (city && county && stateCode && postalCode && addressLine1) {
      results.push({ streetLine, addressLine1, city, county, state: stateCode, postalCode });
    }
  }

  return results;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/* eslint-disable no-console */
/**
 * Fetches addresses for every state listed in AVAILABLE_STATES and returns
 * ONE randomly chosen LocationEntry per state.
 *
 * Falls back gracefully to null for any state whose fetch/parse fails so that
 * the rest of the states are unaffected.
 */
export async function fetchLocationsForAllStates(): Promise<LocationEntry[]> {
  const results: LocationEntry[] = [];

  for (const stateCode of AVAILABLE_STATES) {
    try {
      const body = `state=${encodeURIComponent(stateCode)}&count=50`;
      const html = await httpPost('https://cleverutils.com/random-address', body);
      const cards = parseAddressCards(html);

      if (cards.length === 0) {
        console.warn(`[fetchLocations] No address cards parsed for state: ${stateCode}`);
        continue;
      }

      // Pick one randomly
      const picked = cards[Math.floor(Math.random() * cards.length)];

      results.push({
        addressLine1: picked.addressLine1,
        city: picked.city,
        county: picked.county,
        state: picked.state,
        postalCode: picked.postalCode,
      });

      console.log(
        `[fetchLocations] ${stateCode} → ${picked.addressLine1}, ${picked.city}, ${picked.county} ${picked.postalCode}`,
      );
    } catch (err) {
      console.warn(
        `[fetchLocations] Failed to fetch addresses for state ${stateCode}:`,
        err instanceof Error ? err.message : String(err),
      );
    }
  }

  return results;
}

/**
 * Fetches addresses for a SINGLE state and returns ONE LocationEntry.
 * Useful when you only need to refresh one state's entry.
 */
export async function fetchLocationForState(stateCode: string): Promise<LocationEntry | null> {
  try {
    const body = `state=${encodeURIComponent(stateCode)}&count=50`;
    const html = await httpPost('https://cleverutils.com/random-address', body);
    const cards = parseAddressCards(html);

    if (cards.length === 0) return null;

    const picked = cards[Math.floor(Math.random() * cards.length)];
    return {
      addressLine1: picked.addressLine1,
      city: picked.city,
      county: picked.county,
      state: picked.state,
      postalCode: picked.postalCode,
    };
  } catch {
    return null;
  }
}
