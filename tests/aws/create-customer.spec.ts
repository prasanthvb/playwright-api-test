import { test, expect, request } from '@playwright/test';
import { generatePayloadWithFakerData } from "../../utils/payload/generate-new-customer-payload";
import { runFullFlow } from '../../utils/aws-utils/aws-flow-helper';

test.describe('AWS Create Customer API - Negative + Validation Flow', () => {
  

  // CC-02 Missing required field (accountName)
  test('CC-02 Missing required field (accountName)', async ({ request }) => {
    const payload = generatePayloadWithFakerData();
    (await payload).accountName = '';
    await runFullFlow(request, payload, 'Missing Account Name');
    // Expected to fail with DynamoDB validation 500
  });

  // // CC-03 Invalid email format
  // test('CC-03 Invalid email format', async () => {
  //   const payload = generatePayloadWithFakerData();
  //   (await payload).primaryEmail = 'invalidEmailFormat';
  //   await runFullFlow(request, payload, 'Invalid Email Format');
  // });

  // // CC-04 Invalid phone number
  // test('CC-04 Invalid phone number', async () => {
  //   const payload = generatePayloadWithFakerData();
  //   (await payload).phone = 'ABC-123';
  //   await runFullFlow(request, payload, 'Invalid Phone Number');
  // });

  // // CC-06 Liquor License boundary (max 40)
  // test('CC-06 Liquor License >40 chars', async () => {
  //   const payload = generatePayloadWithFakerData();
  //   (await payload).alcoholLicenseNumber = 'L'.repeat(41);
  //   await runFullFlow(request, payload, 'Liquor License >40 characters');
  // });

  // // CC-12 Invalid State input
  // test('CC-12 Invalid State input', async () => {
  //   const payload = generatePayloadWithFakerData();
  //   (await payload).Address[0].state = 'ZZ';
  //   await runFullFlow(request, payload, 'Invalid State Input');
  // });

  // // CC-19 Off Premise valid selection
  // test('CC-19 Off Premise valid', async () => {
  //   const payload = generatePayloadWithFakerData();
  //   (await payload).distributionChannel = { Code: '20', Name: 'Off Premise' };
  //   await runFullFlow(request, payload, 'Off Premise Valid Flow');
  // });

  // // CC-21 Unauthorized request (invalid API key)
  // test('CC-21 Unauthorized Request', async ({ request }) => {
  //   const payload = generatePayloadWithFakerData();
  //   const res = await request.post('https://cvx1f3z70f.execute-api.us-east-1.amazonaws.com/sandbox/create-customer', {
  //     headers: { 'Content-Type': 'application/json', 'x-api-key': 'INVALID_KEY' },
  //     data: payload,
  //   });
  //   console.log('Unauthorized Response:', await res.text());
  //   expect([401, 403]).toContain(res.status());
  // });
});
