import { test, expect } from '@playwright/test';
import { getSalesforceAuthToken } from '../../utils/auth/sf-auth';
import { basePayload, generatePayloadWithFakerData } from '../../utils/payload/generate-new-customer-payload';
import apiPaths from '../../fixtures/api-path.json';

let authToken: string;

test.beforeAll(async ({ request }) => {
  authToken = await getSalesforceAuthToken(request);
});

test.describe('Salesforce API - Negative Scenarios', () => {
  test('Invalid token should return 401', async ({ request }) => {
    const apiUrl = `${process.env.SF_SANDBOX_URL}${apiPaths['sf-create-customer']}`;
    const payload = generatePayloadWithFakerData();

    const response = await request.post(apiUrl, {
      headers: {
        Authorization: `Bearer INVALID_TOKEN`,
        'Content-Type': 'application/json',
      },
      data: payload,
    });

    expect(response.status()).toBe(401);
  });

  test('Missing mandatory fields should return 400/422', async ({ request }) => {
    const apiUrl = `${process.env.SF_SANDBOX_URL}${apiPaths['sf-create-customer']}`;
    const invalidPayload = { ...basePayload };

    const response = await request.post(apiUrl, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      data: invalidPayload,
    });

    expect([400, 422]).toContain(response.status());
  });
});
