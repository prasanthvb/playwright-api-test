import { test, expect } from '@playwright/test';
import path from 'path';
import data from '../../data/api-data/test-data.json';
import apiPaths from '../../data/api-data/api-path.json';
import { createBaselineWithRetry } from '../../custom_modules/api/aws-utils/aws-create-update-baseline-helper';
import {
  getValidLicensePayload,
  getDuplicateLicensePayload,
  getInvalidLicenseTypePayload,
  getInvalidLicenseDatesPayload,
  getMissingLicenseNumberPayload,
  getMissingLicenseDatesPayload,
  getMissingLicenseTypePayload,
} from '../../custom_modules/api/payload/update-licence-payload';
import { runUpdateFlow } from '../../custom_modules/api/aws-utils/aws-update-flow-helper';
const baselineFilePath = path.join(process.cwd(), 'src/data/update-baseline/edit-licence.json');

import { awsConfig } from '../../../config/api-config';

const baseUrl = awsConfig.baseUrl;
const apiKey = awsConfig.apiKey;

// Helper to add API key header
function authHeaders() {
  return {
    'x-api-key': apiKey ?? '',
  };
}

test.describe('Verify Edit License API', () => {
  let globalID: string;
  let licenceNumber: string;

  test.beforeAll(async ({ request }) => {
    // This will create a new baseline customer and return globalID and licenceNumber
    const baselineResult = await createBaselineWithRetry(request, baselineFilePath, 3);
    if (baselineResult) {
      globalID = baselineResult.globalID;
      licenceNumber = baselineResult.licenceNumber;
    } else {
      globalID = data.globalIDQA;
      licenceNumber = '';
    }
    if (!globalID || globalID === 'NA') {
      globalID = data.globalIDQA;
    }
    // globalID = data.globalIDQA;
    expect(globalID).toBeTruthy();
  });

  test('TC-LIC-01 | Verify edit license with valid details', async ({ request }) => {
    const payload = getValidLicensePayload();
    payload.license.number = licenceNumber; // Use existing license number
    const response = await request.patch(
      `${baseUrl}${apiPaths['update-customer-account-details']}/${globalID}?action=license`,
      { data: payload, headers: authHeaders() },
    );

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.updateRequestID).toBeTruthy();

    const updateResult = await runUpdateFlow(request, body, globalID);

    expect(updateResult.status).toBe('active');
    expect(updateResult.updatedCustomer?.body.data.customer.licenses[0].number).toBe(payload.license.number);
    expect(updateResult.updatedCustomer?.body.data.customer.licenses[0].effectiveDate).toBe(
      payload.license.effectiveDate,
    );
    expect(updateResult.updatedCustomer?.body.data.customer.licenses[0].expirationDate).toBe(
      payload.license.expirationDate,
    );
    expect(updateResult.updatedCustomer?.body.data.customer.licenses[0].type).toBe('ZGAL');
    expect(updateResult.updatedCustomer?.body.data.customer.licenses[0].legalRegulation).toBe('1');
  });

  test('TC-LIC-02 | Verify edit with duplicate license number', async ({ request }) => {
    const payload = getDuplicateLicensePayload();

    const response = await request.patch(
      `${baseUrl}${apiPaths['update-customer-account-details']}/${globalID}?action=license`,
      { data: payload, headers: authHeaders() },
    );

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.updateRequestID).toBeTruthy();

    const updateResult = await runUpdateFlow(request, body, globalID);
    expect(updateResult.status).toBe('active');
    expect(updateResult.updatedCustomer?.body.data.customer.licenses[0].number).not.toBe(payload.license.number);
    expect(updateResult.updatedCustomer?.body.data.customer.licenses[0].effectiveDate).not.toBe(
      payload.license.effectiveDate,
    );
    expect(updateResult.updatedCustomer?.body.data.customer.licenses[0].expirationDate).not.toBe(
      payload.license.expirationDate,
    );
    expect(updateResult.updatedCustomer?.body.data.customer.licenses[0].type).toBe('ZGAL');
    expect(updateResult.updatedCustomer?.body.data.customer.licenses[0].legalRegulation).toBe('1');
  });

  test('TC-LIC-03 | Verify edit licence with Invalid license type', async ({ request }) => {
    const payload = getInvalidLicenseTypePayload();
    payload.license.number = licenceNumber; // Use existing license number
    const response = await request.patch(
      `${baseUrl}${apiPaths['update-customer-account-details']}/${globalID}?action=license`,
      { data: payload, headers: authHeaders() },
    );

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.updateRequestID).toBeTruthy();

    const updateResult = await runUpdateFlow(request, body, globalID);
    // The invalid type validation is not enforced server-side, so status will be active
    expect(updateResult.status).toBe('active');
  });

  test('TC-LIC-04 | Verify edit licence with Invalid effective date and expiration date', async ({ request }) => {
    const payload = getInvalidLicenseDatesPayload();
    payload.license.number = licenceNumber; // Use existing license number
    const response = await request.patch(
      `${baseUrl}${apiPaths['update-customer-account-details']}/${globalID}?action=license`,
      { data: payload, headers: authHeaders() },
    );

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.updateRequestID).toBeTruthy();

    const updateResult = await runUpdateFlow(request, body, globalID);
    // The invalid dates validation is not enforced server-side, so status will be active
    expect(updateResult.status).toBe('active');
  });

  test('TC-LIC-05 | Verify edit licence with missing license details object', async ({ request }) => {
    const payload = {}; // Empty payload
    const response = await request.patch(
      `${baseUrl}${apiPaths['update-customer-account-details']}/${globalID}?action=license`,
      { data: payload, headers: authHeaders() },
    );

    expect(response.status()).toBe(500);
    const errorBody = await response.json();
    expect(errorBody.error).toBe("Cannot read properties of undefined (reading 'length')");
  });

  test('TC-LIC-06 | Verify edit licence with missing license number', async ({ request }) => {
    const payload = getMissingLicenseNumberPayload();

    const response = await request.patch(
      `${baseUrl}${apiPaths['update-customer-account-details']}/${globalID}?action=license`,
      { data: payload, headers: authHeaders() },
    );

    expect(response.status()).toBe(500);

    const body = await response.json();
    expect(body.error).toBe('Missing fields for license: number');
  });

  test('TC-LIC-07 | Verify edit licence with missing license effective date and expiration date', async ({
    request,
  }) => {
    const payload = getMissingLicenseDatesPayload();

    const response = await request.patch(
      `${baseUrl}${apiPaths['update-customer-account-details']}/${globalID}?action=license`,
      { data: payload, headers: authHeaders() },
    );

    expect(response.status()).toBe(500);

    const body = await response.json();
    expect(body.error).toBe('Missing fields for license: effectiveDate, expirationDate');
  });

  test('TC-LIC-08 | Verify edit licence with missing license type', async ({ request }) => {
    const payload = getMissingLicenseTypePayload();

    const response = await request.patch(
      `${baseUrl}${apiPaths['update-customer-account-details']}/${globalID}?action=license`,
      { data: payload, headers: authHeaders() },
    );

    expect(response.status()).toBe(500);

    const body = await response.json();
    expect(body.error).toBe('Missing fields for license: type');
  });
});
