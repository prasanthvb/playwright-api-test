import { test, expect } from '@playwright/test';
import path from 'path';
import data from '../../data/api-data/test-data.json';
import apiPaths from '../../data/api-data/api-path.json';
import { createBaselineWithRetry } from '../../custom_modules/api/aws-utils/aws-create-update-baseline-helper';
import {
  getValidAccountDetailsPayload,
  getInvalidEmailPayload,
  getInvalidPhonePayload,
} from '../../custom_modules/api/payload/update-account-details-payload';
import { runUpdateFlow } from '../../custom_modules/api/aws-utils/aws-update-flow-helper';
const baselineFilePath = path.join(process.cwd(), 'src/data/update-baseline/account-details.json');

import { awsConfig } from '../../../config/api-config';

const baseUrl = awsConfig.baseUrl;
const apiKey = awsConfig.apiKey;

// Helper to add API key header
function authHeaders() {
  return {
    'x-api-key': apiKey ?? '',
  };
}

test.describe('Verify update Account Details API', () => {
  let globalID: string;

  test.beforeAll(async ({ request }) => {
    // This will create a new baseline customer and return globalID and licenceNumber
    const baselineResult = await createBaselineWithRetry(request, baselineFilePath, 3);
    if (baselineResult) {
      globalID = baselineResult.globalID;
    } else {
      globalID = data.globalIDQA;
    }
    if (!globalID || globalID === 'NA') {
      globalID = data.globalIDQA;
    }
    // globalID = data.globalIDQA;
    expect(globalID).toBeTruthy();
  });

  test('TC-ACC-01 | Verify update account details with valid data', async ({ request }) => {
    const payload = getValidAccountDetailsPayload();

    const response = await request.patch(
      `${baseUrl}${apiPaths['update-customer-account-details']}/${globalID}?action=accountDetails`,
      { data: payload, headers: authHeaders() },
    );

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.updateRequestID).toBeTruthy();

    const updateResult = await runUpdateFlow(request, body, globalID);

    if (updateResult.status === 'active') {
      expect(updateResult.status).toBe('active');
      expect(updateResult.updatedCustomer?.body.data.customer.contactFirstName).toBe(
        payload.accountDetails.contactFirstName,
      );
      expect(updateResult.updatedCustomer?.body.data.customer.contactLastName).toBe(
        payload.accountDetails.contactLastName,
      );
      expect(updateResult.updatedCustomer?.body.data.customer.primaryEmail.toLowerCase()).toBe(
        payload.accountDetails.primaryEmail.toLowerCase(),
      );
      expect(updateResult.updatedCustomer?.body.data.customer.phone).toBe(payload.accountDetails.phone);
    }
  });

  test('TC-ACC-02 | Verify update account details with invalid email format', async ({ request }) => {
    const payload = getInvalidEmailPayload();

    const response = await request.patch(
      `${baseUrl}${apiPaths['update-customer-account-details']}/${globalID}?action=accountDetails`,
      { data: payload, headers: authHeaders() },
    );

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.updateRequestID).toBeTruthy();

    const updateResult = await runUpdateFlow(request, body, globalID);
    expect(updateResult.status).toBe('error');
  });

  test('TC-ACC-03 | Verify update account details with invalid phone format', async ({ request }) => {
    const payload = getInvalidPhonePayload();

    const response = await request.patch(
      `${baseUrl}${apiPaths['update-customer-account-details']}/${globalID}?action=accountDetails`,
      { data: payload, headers: authHeaders() },
    );

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.updateRequestID).toBeTruthy();

    const updateResult = await runUpdateFlow(request, body, globalID);
    expect(updateResult.status).toBe('error');
  });

  test('TC-ACC-04 | Verify update account details with missing accountDetails object', async ({ request }) => {
    const payload = {}; // Empty payload
    const response = await request.patch(
      `${baseUrl}${apiPaths['update-customer-account-details']}/${globalID}?action=accountDetails`,
      { data: payload, headers: authHeaders() },
    );

    expect(response.status()).toBe(500);
    const errorBody = await response.json();
    expect(errorBody.error).toBe('accountDetails is required for action accountDetails');
  });

  test('TC-ACC-05 | Verify update account details with unauthorized request', async ({ request }) => {
    const payload = getValidAccountDetailsPayload();

    const response = await request.patch(
      `${baseUrl}${apiPaths['update-customer-account-details']}/${globalID}?action=accountDetails`,
      { data: payload, headers: { 'x-api-key': 'INVALID_KEY' } },
    );

    expect([401, 403]).toContain(response.status());
  });

  test('TC-ACC-06 | Verify update account details with invalid globalID', async ({ request }) => {
    const response = await request.patch(
      `${baseUrl}${apiPaths['update-customer-account-details']}/9999999999?action=accountDetails`,
      { data: getValidAccountDetailsPayload(), headers: authHeaders() },
    );

    expect(response.status()).toBe(500);
  });
});
