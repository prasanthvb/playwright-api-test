/**
 * global-setup.ts
 *
 * Runs ONCE before any Playwright test worker starts.
 * Fetches one live random address per active state from
 *   https://cleverutils.com/random-address
 * and populates US_LOCATIONS so every test gets a fresh real address.
 *
 * If the API is unreachable (e.g. offline / CI network issue) the module
 * gracefully falls back to the static FALLBACK_LOCATIONS defined in
 * locationData.ts — tests will still run with sensible defaults.
 */
import { initLocations } from './custom_modules/common/common-utils/locationData';

export default async function globalSetup() {
  await initLocations();
}
