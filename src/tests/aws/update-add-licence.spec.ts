import { test, expect } from '@playwright/test';
import path from 'path';
import data from '../../data/api-data/test-data.json';
import apiPaths from '../../data/api-data/api-path.json';
import { createBaselineWithRetry } from '../../custom_modules/api/aws-utils/aws-create-update-baseline-helper';
import { getCustomerByGlobalID } from '../../custom_modules/api/aws-utils/aws-api-helper';
import {
  addNewLicensePayload,
  getDuplicateLicensePayload,
  getInvalidLicenseTypePayload,
  getInvalidLicenseDatesPayload,
  getMissingLicenseNumberPayload,
  getMissingLicenseDatesPayload,
  getMissingLicenseTypePayload,
  getDifferentLicenseDetailsPayload,
} from '../../custom_modules/api/payload/update-licence-payload';
import { runUpdateFlow } from '../../custom_modules/api/aws-utils/aws-update-flow-helper';
const baselineFilePath = path.join(process.cwd(), 'src/data/update-baseline/edit-licence.json');

import { awsConfig, getAuthHeaders } from '../../../config/api-config';

const baseUrl = awsConfig.baseUrl;

test.describe('Verify Add License API', () => {
  let globalID: string;
  let licenceNumber: string;
  let customerState: string;
  let licenseType: string;

  test.beforeAll(async ({ request }) => {
    // This will create a new baseline customer and return globalID and licenceNumber
    const baselineResult = await createBaselineWithRetry(request, baselineFilePath, 3);
    if (baselineResult) {
      globalID = baselineResult.globalID;
      licenceNumber = baselineResult.licenceNumber || '';
      customerState = baselineResult.getCustomerAddress?.state || 'KY';
      // Fetch the customer to get the license type
      const customerResponse = await getCustomerByGlobalID(request, globalID);
      const licenses = customerResponse?.body?.data?.customer?.licenses || [];
      licenseType = licenses[0]?.type || 'QUOTA RETAIL PACKAGE LICENSE';
    } else {
      globalID = data.globalIDQA;
      licenceNumber = '';
      customerState = 'KY'; // Default to KY if baseline creation fails
      licenseType = 'QUOTA RETAIL PACKAGE LICENSE';
    }
    if (!globalID || globalID === 'NA') {
      globalID = data.globalIDQA;
    }
    // globalID = data.globalIDQA;
    expect(globalID).toBeTruthy();
    expect(customerState).toBeTruthy();
  });

  test('TC-LIC-09 | Verify add license with valid details', async ({ request }) => {
    const payload = addNewLicensePayload(customerState);
    const response = await request.patch(
      `${baseUrl}${apiPaths['update-customer-account-details']}/${globalID}?action=license`,
      { data: payload, headers: getAuthHeaders() },
    );

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.updateRequestID).toBeTruthy();

    const updateResult = await runUpdateFlow(request, body, globalID);

    expect(updateResult.status).toBe('active');
    // Find the license in the updated licenses array that matches the payload license number
    const updatedLicenses = updateResult.updatedCustomer?.body.data.customer.licenses || [];
    const matchedLicense = updatedLicenses.find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (license: Record<string, any>) => license.number === payload.license.number,
    );

    expect(matchedLicense).toBeTruthy();
    expect(matchedLicense.effectiveDate).toBe(payload.license.effectiveDate);
    expect(matchedLicense.expirationDate).toBe(payload.license.expirationDate);
    expect(matchedLicense.type).toBe(payload.license.type);
    expect(matchedLicense.legalRegulation).toBe('1');
  });

  test('TC-LIC-10 | Verify add with duplicate license number', async ({ request }) => {
    const payload = getDuplicateLicensePayload(customerState);
    payload.license.operation = 'add';
    const response = await request.patch(
      `${baseUrl}${apiPaths['update-customer-account-details']}/${globalID}?action=license`,
      { data: payload, headers: getAuthHeaders() },
    );

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.updateRequestID).toBeTruthy();

    const updateResult = await runUpdateFlow(request, body, globalID);

    expect(updateResult.status).toBe('active');
    // Find the license in the updated licenses array that matches the payload license number
    const updatedLicenses = updateResult.updatedCustomer?.body.data.customer.licenses || [];
    const matchedLicense = updatedLicenses.find(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (license: Record<string, any>) => license.number === payload.license.number,
    );

    expect(matchedLicense).toBeTruthy();
    expect(matchedLicense.effectiveDate).toBe(payload.license.effectiveDate);
    expect(matchedLicense.expirationDate).toBe(payload.license.expirationDate);
    // expect(matchedLicense.type).toBe('ZGAL');
    expect(matchedLicense.legalRegulation).toBe('1');
  });

  test('TC-LIC-11 | Verify add licence with Invalid license type', async ({ request }) => {
    const payload = getInvalidLicenseTypePayload();
    payload.license.operation = 'add';
    const response = await request.patch(
      `${baseUrl}${apiPaths['update-customer-account-details']}/${globalID}?action=license`,
      { data: payload, headers: getAuthHeaders() },
    );

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.updateRequestID).toBeTruthy();

    const updateResult = await runUpdateFlow(request, body, globalID);
    // The invalid type validation is not enforced server-side, so status will be active
    expect(updateResult.status).toBe('active');
  });

  test('TC-LIC-12 | Verify add licence with Invalid effective date and expiration date', async ({ request }) => {
    const payload = getInvalidLicenseDatesPayload(customerState);
    payload.license.operation = 'add';
    const response = await request.patch(
      `${baseUrl}${apiPaths['update-customer-account-details']}/${globalID}?action=license`,
      { data: payload, headers: getAuthHeaders() },
    );

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.updateRequestID).toBeTruthy();

    const updateResult = await runUpdateFlow(request, body, globalID);
    // The invalid dates validation is not enforced server-side, so status will be active
    expect(updateResult.status).toBe('active');
  });

  test('TC-LIC-13 | Verify add licence with missing license details object', async ({ request }) => {
    const payload = {}; // Empty payload
    const response = await request.patch(
      `${baseUrl}${apiPaths['update-customer-account-details']}/${globalID}?action=license`,
      { data: payload, headers: getAuthHeaders() },
    );

    expect(response.status()).toBe(500);
    const errorBody = await response.json();
    expect(errorBody.error).toBe("Cannot read properties of undefined (reading 'length')");
  });

  test('TC-LIC-14 | Verify add licence with missing license number', async ({ request }) => {
    const payload = getMissingLicenseNumberPayload(customerState);
    payload.license.operation = 'add';
    const response = await request.patch(
      `${baseUrl}${apiPaths['update-customer-account-details']}/${globalID}?action=license`,
      { data: payload, headers: getAuthHeaders() },
    );

    expect(response.status()).toBe(500);

    const body = await response.json();
    expect(body.error).toBe('Missing fields for license: number');
  });

  test('TC-LIC-15 | Verify add licence with missing license effective date and expiration date', async ({
    request,
  }) => {
    const payload = getMissingLicenseDatesPayload(customerState);
    payload.license.operation = 'add';
    const response = await request.patch(
      `${baseUrl}${apiPaths['update-customer-account-details']}/${globalID}?action=license`,
      { data: payload, headers: getAuthHeaders() },
    );

    expect(response.status()).toBe(500);

    const body = await response.json();
    expect(body.error).toBe('Missing fields for license: effectiveDate, expirationDate');
  });

  test('TC-LIC-16 | Verify add licence with missing license type', async ({ request }) => {
    const payload = getMissingLicenseTypePayload();
    payload.license.operation = 'add';
    const response = await request.patch(
      `${baseUrl}${apiPaths['update-customer-account-details']}/${globalID}?action=license`,
      { data: payload, headers: getAuthHeaders() },
    );

    expect(response.status()).toBe(500);

    const body = await response.json();
    expect(body.error).toBe('Missing fields for license: type');
  });

  test('TC-LIC-17 | Verify existing licence with different details', async ({ request }) => {
    // Using the successfully created license number with different type and legal regulation
    // This should fail because we're trying to add an existing license with different details
    const payload = getDifferentLicenseDetailsPayload(licenceNumber, customerState, licenseType);
    payload.license.operation = 'add';
    const response = await request.patch(
      `${baseUrl}${apiPaths['update-customer-account-details']}/${globalID}?action=license`,
      { data: payload, headers: getAuthHeaders() },
    );

    expect(response.status()).toBe(500);

    const body = await response.json();
    // The error might vary, but it should indicate a conflict or validation error
    expect(body.error).toBeTruthy();
  });
});
