// locationData.ts
//
// US_LOCATIONS is populated at runtime by fetching one real random address per
// active state from https://cleverutils.com/random-address.
//
// ─── How it works ───────────────────────────────────────────────────────────
//  1. availableStates.ts  → defines which state codes are active (AR, TN, …)
//  2. fetchLocations.ts   → calls the API for each state, parses HTML cards,
//                           picks one address randomly per state
//  3. locationData.ts     → calls fetchLocationsForAllStates() once at module
//                           load (top-level await) and exposes the result as
//                           US_LOCATIONS — the same variable name all other
//                           modules already import, so zero consumer changes.
//
// ─── To add / remove a state ────────────────────────────────────────────────
//  Edit availableStates.ts  (no changes needed here or anywhere else).
// ────────────────────────────────────────────────────────────────────────────

export interface LocationEntry {
  addressLine1: string;
  city: string;
  county: string;
  state: string;
  postalCode: string;
}

// Static fallback used when the live API is unreachable (e.g. offline CI runs).
const FALLBACK_LOCATIONS: LocationEntry[] = [
  { addressLine1: '1500 West 3rd Street', state: 'AR', city: 'Little Rock', county: 'Pulaski', postalCode: '72201' },
  { addressLine1: '125 N Main St', state: 'TN', city: 'Memphis', county: 'Shelby', postalCode: '38103' },
];

/**
 * Initialises US_LOCATIONS by fetching live random addresses from the API.
 * Falls back to FALLBACK_LOCATIONS if the fetch fails or returns nothing.
 *
 * Safe to call from anywhere — including inside individual tests or payload
 * generators. The HTTP fetch is performed only ONCE; every subsequent call
 * awaits the same in-flight Promise and returns immediately.
 */

// A single shared Promise so concurrent callers all wait for the same fetch.
let _initPromise: Promise<void> | null = null;

export function initLocations(): Promise<void> {
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    try {
      // Use require() — this project is CommonJS ("type":"commonjs" in package.json)
      // so dynamic import() of a .ts file doesn't work at runtime in Playwright workers.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { fetchLocationsForAllStates } = require('./fetchLocations') as typeof import('./fetchLocations');
      const fetched = await fetchLocationsForAllStates();

      if (fetched.length > 0) {
        // Replace in-place so every existing reference to US_LOCATIONS
        // (captured before initLocations was called) also sees live data.
        US_LOCATIONS.length = 0;
        US_LOCATIONS.push(...fetched);
      }
    } catch {
      // Network unavailable — keep the fallback values already in the array.
    }
  })();

  return _initPromise;
}

/**
 * US_LOCATIONS — exported array of active-state location entries.
 *
 * Starts pre-filled with FALLBACK_LOCATIONS so it is always safe to read
 * synchronously. Call `await initLocations()` early in your setup to replace
 * the values with live random addresses from the API.
 */
export const US_LOCATIONS: LocationEntry[] = [...FALLBACK_LOCATIONS];
