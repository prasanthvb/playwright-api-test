/**
 * availableStates.ts
 *
 * Central registry of US state codes that are active / supported in this project.
 * Add or remove state codes here to control which states get live addresses fetched
 * and which states are used when generating random test payloads.
 *
 * These codes are used by fetchLocations.ts to call:
 *   POST https://cleverutils.com/random-address  →  state=<CODE>&count=50
 */
export const AVAILABLE_STATES: string[] = [
  // 'AR', // Arkansas
  // 'TN', // Tennessee
  'KY', // Kentucky
  // ── Uncomment to activate more states ──────────────────────────────────────
  // 'IA', // Iowa
  // 'KS', // Kansas
  // 'LA', // Louisiana
  // 'MO', // Missouri
  // 'OH', // Ohio
  // 'OK', // Oklahoma
  // 'PA', // Pennsylvania
  // 'TX', // Texas
];
