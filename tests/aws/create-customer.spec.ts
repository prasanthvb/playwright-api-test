import { test, expect, request } from '@playwright/test';
import { generatePayloadWithFakerData } from "../../utils/payload/generate-new-customer-payload";
import { runFullFlow } from '../../utils/aws-utils/aws-flow-helper';
import expectedErrors from '../../fixtures/aws-error-messages.json';
import data from '../../fixtures/test-data.json';

test.describe('AWS Create Customer API - Negative + Validation Flow', () => {
  

  // CC-02 Missing required field (accountName)
  test('CC-02 Missing required field (accountName)', async ({ request }) => {
    const payload = await generatePayloadWithFakerData();
    payload.accountName = '';
    const result = await runFullFlow(request, payload, 'Missing Account Name');
    const expectedError = expectedErrors["CC-02"];

    // Assert
    expect(result).toBeDefined();
    expect(result?.status).toBe(500);
    expect(result?.apiError).toContain(expectedError);
  });

  // CC-03 Invalid email format
  test('CC-03 Invalid email format', async ({ request }) => {
    const payload = await generatePayloadWithFakerData();
    payload.primaryEmail = 'email@example.com (Joe Smith)';
    const result = await runFullFlow(request, payload, 'Invalid Email Format');
    expect(result).toBeDefined();
    expect(result?.status).toBe(200);
  });

  // // CC-04 Invalid phone number
  test('CC-04 Invalid phone number', async ({ request }) => {
    const payload = await generatePayloadWithFakerData();
    payload.phone = 'ABC-123';
    const result = await runFullFlow(request, payload, 'Invalid Phone Number');
    expect(result).toBeDefined();
    expect(result?.status).toBe(200);
  });

  // // CC-05 Duplicate license number
  test('CC-05 Duplicate license number', async ({ request }) => {
    const payload = await generatePayloadWithFakerData();
    payload.alcoholLicenseNumber = data.alcoholLicenseNumber;
    const result = await runFullFlow(request, payload, 'Duplicate license number');
    expect(result).toBeDefined();
    expect(result?.status).toBe(200);
  });

  // // CC-06 Liquor License boundary (max 40)
  test('CC-06 Liquor License >40 chars', async ({ request }) => {
    const payload = await generatePayloadWithFakerData();
    payload.alcoholLicenseNumber = 'L'.repeat(41);
    const result = await runFullFlow(request, payload, 'Liquor License >40 characters');
    expect(result).toBeDefined();
    expect(result?.status).toBe(200);
  });

  // // CC-08 Business Name boundary (max 100)
  test('CC-08 Account Name > 100 chars', async ({ request }) => {
    const payload = await generatePayloadWithFakerData();
    payload.accountName = 'L'.repeat(101);
    const result = await runFullFlow(request, payload, 'Account Name > 100 characters');
    expect(result).toBeDefined();
    expect(result?.status).toBe(200);
  });

  // CC-09 Street Address boundary (max 100)
  test('CC-09 Street Address > 100 chars', async ({ request }) => {
    const payload = await generatePayloadWithFakerData();
    payload.Address[0].addressLine1 = 'L'.repeat(101);
    const result = await runFullFlow(request, payload, 'Street Address > 100 characters');
    expect(result).toBeDefined();
    expect(result?.status).toBe(200);
  });

  // // CC-10 City boundary (max 40)
  test('CC-10 City > 40 chars', async ({ request }) => {
    const payload = await generatePayloadWithFakerData();
    payload.Address[0].city = 'L'.repeat(41);
    const result = await runFullFlow(request, payload, 'City > 40 characters');
    expect(result).toBeDefined();
    expect(result?.status).toBe(200);
  });

  // // CC-11 County boundary (max 40)
  test('CC-11 County > 40 chars', async ({ request }) => {
    const payload = await generatePayloadWithFakerData();
    payload.Address[0].county = 'L'.repeat(41);
    const result = await runFullFlow(request, payload, 'County > 40 characters');
    expect(result).toBeDefined();
    expect(result?.status).toBe(200);
  });

  // // CC-12 Invalid State input
  test('CC-12 Invalid State input', async ({ request }) => {
    const payload = await generatePayloadWithFakerData();
    payload.Address[0].state = 'TX';
    const result = await runFullFlow(request, payload, 'Invalid State Input');
    expect(result).toBeDefined();
    expect(result?.status).toBe(200);
  });

  // // CC-14 State boundary value – invalid full name length (>50)
  test('CC-14 State > 50 chars', async ({ request }) => {
    const payload = await generatePayloadWithFakerData();
    payload.Address[0].state = 'L'.repeat(51);
    const result = await runFullFlow(request, payload, 'State > 50 characters');
    expect(result).toBeDefined();
    expect(result?.status).toBe(200);
  });

  // // CC-15 Postal Code validation (exact 5 digits)
  test('CC-15 Postal code < 5 chars', async ({ request }) => {
    const payload = await generatePayloadWithFakerData();
    payload.Address[0].postalCode = '2'.repeat(4);
    const result = await runFullFlow(request, payload, 'Postal code < 5 characters');
    expect(result).toBeDefined();
    expect(result?.status).toBe(200);
  });

  // // CC-16 First Name boundary (max 40)
  test('CC-16 First Name > 40 chars', async ({ request }) => {
    const payload = await generatePayloadWithFakerData();
    payload.contactFirstName = 'L'.repeat(41);
    const result = await runFullFlow(request, payload, 'Last Name > 41 characters');
    expect(result).toBeDefined();
    expect(result?.status).toBe(200);
  });

  // // CC-17 Last Name boundary (max 40)
  test('CC-17 Last Name > 40 chars', async ({ request }) => {
    const payload = await generatePayloadWithFakerData();
    payload.contactLastName = 'L'.repeat(41);
    const result = await runFullFlow(request, payload, 'Last Name > 41 characters');
    expect(result).toBeDefined();
    expect(result?.status).toBe(200);
  });

  // // CC-19 Off Premise valid selection
  test('CC-19 Off Premise valid', async ({ request }) => {
    const payload = await generatePayloadWithFakerData();
    payload.distributionChannel = { Code: '20', Name: 'Off Premise' };
    const result = await runFullFlow(request, payload, 'Off Premise Valid Flow');
    expect(result).toBeDefined();
    expect(result?.status).toBe(200);
  });

  // // CC-20 On/Off Premise – missing selection
  test('CC-20 On/Off Premise - missing selection', async ({ request }) => {
    const payload = await generatePayloadWithFakerData();
    payload.distributionChannel = null;
    const result = await runFullFlow(request, payload, 'On/Off Premise - missing selection');
    expect(result).toBeDefined();
    expect(result?.status).toBe(200);
  }); 

  // // CC-21 Unauthorized request (invalid API key)
  test('CC-21 Unauthorized Request', async ({ request }) => {
    const payload = await generatePayloadWithFakerData();
    const res = await request.post('https://cvx1f3z70f.execute-api.us-east-1.amazonaws.com/sandbox/create-customer', {
      headers: { 'Content-Type': 'application/json', 'x-api-key': 'INVALID_KEY' },
      data: payload,
    });
    console.log('Unauthorized Response:', await res.text());
    expect([401, 403]).toContain(res.status());
  });
});
