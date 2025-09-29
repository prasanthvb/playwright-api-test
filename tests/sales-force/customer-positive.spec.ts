import { test, expect } from '@playwright/test';
import { getSalesforceAuthToken } from '../../utils/auth/sf-auth';
import { generatePayloadWithFakerData } from '../../utils/payload/generate-new-customer-payload';
import apiPaths from '../../fixtures/api-path.json';

let authToken: string;

test.beforeAll(async ({ request }) => {
  authToken = await getSalesforceAuthToken(request);
});

test.describe('Salesforce API - Positive Scenarios', () => {
  test('Create account with valid details', async ({ request }) => {
    const apiUrl = `${process.env.SF_SANDBOX_URL}${apiPaths['sf-create-customer']}`;
    const payload = generatePayloadWithFakerData();

    const response = await request.post(apiUrl, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      data: payload,
    });

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    const data = await response.json();
    console.log('Positive Test Response:', data);
    expect(data.globalId || data.customerID).toBeDefined();
  });
});
