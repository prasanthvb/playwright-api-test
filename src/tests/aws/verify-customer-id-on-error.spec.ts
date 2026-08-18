import { test, expect } from '@playwright/test';
import { generatePayloadWithFakerData } from '../../custom_modules/api/payload/generate-new-customer-payload';
import { runFullFlow } from '../../custom_modules/api/aws-utils/aws-flow-helper';
import { createCustomer, pollGetRequest } from '../../custom_modules/api/aws-utils/aws-api-helper';

test.describe('CUSTOMER-120 | Verify customer_id is captured on the request record even when status is Error', () => {
  test('CID-01 | Duplicate customer error still carries the existing customer_id for retry/refresh', async ({
    request,
  }) => {
    test.setTimeout(300_000);
    const payload = await generatePayloadWithFakerData();

    const first = await runFullFlow(request, payload, 'CUSTOMER-120 - create original customer');
    expect(first.status).toBe(200);
    expect(first.getRequestStatus).toContain('Active');
    expect(first.globalID).toBeTruthy();

    // Attempt to create the exact same customer again - the backend already knows which
    // existing customer this collides with, so that customer_id should be present on this
    // errored request too, even though this particular attempt never completes.
    // Duplicate detection has been slow in this environment, so poll with a longer budget
    // than the shared runFullFlow default (75s) instead of changing that helper for everyone.
    const dupCreate = await createCustomer(request, payload);
    expect(dupCreate.status).toBe(200);
    expect(dupCreate.requestID).toBeTruthy();

    const dupPoll = await pollGetRequest(request, dupCreate.requestID as string, 40, 6);
    expect(dupPoll.status).toContain('Error');

    const errors = dupPoll.getReqData?.error;
    expect(errors).toBeDefined();
    expect(Array.isArray(errors)).toBeTruthy();
    expect(errors.length).toBeGreaterThan(0);

    expect(dupPoll.getReqData?.data?.globalID).toBeTruthy();
    expect(dupPoll.getReqData?.data?.globalID).toBe(first.globalID);
  });
});
