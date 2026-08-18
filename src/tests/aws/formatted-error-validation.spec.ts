import { test, expect } from '@playwright/test';
import { generatePayloadWithFakerData } from '../../custom_modules/api/payload/generate-new-customer-payload';
import { runFullFlow } from '../../custom_modules/api/aws-utils/aws-flow-helper';

test.describe('CUSTOMER-113 | Verify formattedError property on request-get error response', () => {
  test('FE-01 | Duplicate customer error response includes formattedError alongside error', async ({ request }) => {
    const payload = await generatePayloadWithFakerData();

    const result = await runFullFlow(request, payload, 'Create customer with valid details');
    expect(result.status).toBe(200);
    expect(result.getRequestStatus).toContain('Active');
    expect(result.globalID).toBeTruthy();

    // Attempt to create the same customer again to force a duplicate error on request-get
    const duplicateResult = await runFullFlow(request, payload, 'Duplicate Customer Creation');
    expect(duplicateResult.status).toBe(200);
    expect(duplicateResult.getRequestStatus).toContain('Error');

    const errors = duplicateResult.getReqData?.error;
    expect(errors).toBeDefined();
    expect(Array.isArray(errors)).toBeTruthy();
    expect(errors.length).toBeGreaterThan(0);

    // error is an array, so formattedError must also be an array (per CUSTOMER-113)
    const formattedErrors = duplicateResult.getReqData?.formattedError;
    expect(formattedErrors).toBeDefined();
    expect(Array.isArray(formattedErrors)).toBeTruthy();
    expect(formattedErrors.length).toBeGreaterThan(0);

    // formattedError must be deduplicated: never more entries than the raw error array
    expect(formattedErrors.length).toBeLessThanOrEqual(errors.length);

    const rawMessages = errors.map((e: { message: string }) => e.message);
    for (const formatted of formattedErrors) {
      expect(formatted).toHaveProperty('source');
      expect(formatted).toHaveProperty('code');
      expect(formatted).toHaveProperty('message');
      // every formatted message must trace back to a raw error message, not be fabricated
      expect(rawMessages).toContain(formatted.message);
    }

    // formattedError itself must contain no duplicate (source, code, message) combinations
    const formattedKeys = formattedErrors.map(
      (f: { source: string; code: string; message: string }) => `${f.source}|${f.code}|${f.message}`,
    );
    expect(new Set(formattedKeys).size).toBe(formattedKeys.length);
  });
});
