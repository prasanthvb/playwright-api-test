import { test, expect } from '@playwright/test';
import path from 'path';
import data from '../../data/api-data/test-data.json';
import apiPaths from '../../data/api-data/api-path.json';
import { createBaselineWithRetry } from '../../custom_modules/api/aws-utils/aws-create-update-baseline-helper';
import {
  getValidBillingAddressPayload,
  getInvalidBillingAddressPayload,
  getEmptyBillingAddressPayload,
  getPartiallyEmptyBillingAddressPayload,
  getNonUSBillingAddressPayload,
} from '../../custom_modules/api/payload/update-billing-address-payload';
import { runUpdateFlow } from '../../custom_modules/api/aws-utils/aws-update-flow-helper';
const baselineFilePath = path.join(process.cwd(), 'src/data/update-baseline/billing-address.json');

import { awsConfig } from '../../../config/api-config';

const baseUrl = awsConfig.baseUrl;
const apiKey = awsConfig.apiKey;

// Helper to add API key header
function authHeaders() {
  return {
    'x-api-key': apiKey ?? '',
  };
}

test.describe('Verify Edit Billing Address API', () => {
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

  test('TC-BILL-01 | Verify edit billing address with valid details', async ({ request }) => {
    const payload = getValidBillingAddressPayload();
    const response = await request.patch(
      `${baseUrl}${apiPaths['update-customer-account-details']}/${globalID}?action=billingAddress`,
      { data: payload, headers: authHeaders() },
    );

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.updateRequestID).toBeTruthy();

    const updateResult = await runUpdateFlow(request, body, globalID);

    expect(updateResult.status).toBe('active');
    // Get all addresses with addressType "Billing"
    const billingAddresses = Array.isArray(updateResult.updatedCustomer?.body.data.customer.addresses)
      ? updateResult.updatedCustomer.body.data.customer.addresses.filter(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (addr: Record<string, any>) => addr.addressType === 'Billing',
        )
      : [];

    // Assert at least one billing address exists
    expect(billingAddresses.length).toBeGreaterThan(0);

    // Use the first billing address for assertions (or loop through if needed)
    const billingAddress = billingAddresses[0];

    // Example assertions for other fields
    expect((billingAddress?.name ?? '').toUpperCase()).toBe(
      (payload.billingAddress.billingEntityName ?? '').toUpperCase(),
    );
    expect(billingAddress?.country).toBe('US');
    expect((billingAddress?.city ?? '').toUpperCase()).toBe((payload.billingAddress.city ?? '').toUpperCase());
    expect((billingAddress?.state ?? '').toUpperCase()).toBe((payload.billingAddress.state ?? '').toUpperCase());
    expect(billingAddress?.postalCode).toBe(payload.billingAddress.postalCode);
    expect((billingAddress?.addressLine1 ?? '').toUpperCase()).toBe(
      (payload.billingAddress.addressLine1 ?? '').toUpperCase(),
    );
    expect(billingAddress?.addressType).toBe('Billing');
  });

  test('TC-BILL-02 | Verify edit billing address with invalid details', async ({ request }) => {
    const payload = getInvalidBillingAddressPayload();
    const response = await request.patch(
      `${baseUrl}${apiPaths['update-customer-account-details']}/${globalID}?action=billingAddress`,
      { data: payload, headers: authHeaders() },
    );

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.updateRequestID).toBeTruthy();

    const updateResult = await runUpdateFlow(request, body, globalID);

    expect(updateResult.status).toBe('error');
  });

  test('TC-BILL-03 | Verify edit billing address with empty address fields', async ({ request }) => {
    const payload = getEmptyBillingAddressPayload();
    const response = await request.patch(
      `${baseUrl}${apiPaths['update-customer-account-details']}/${globalID}?action=billingAddress`,
      { data: payload, headers: authHeaders() },
    );

    expect(response.status()).toBe(500);
  });

  test('TC-BILL-04 | Verify edit billing address with partially empty address fields', async ({ request }) => {
    const payload = getPartiallyEmptyBillingAddressPayload();
    const response = await request.patch(
      `${baseUrl}${apiPaths['update-customer-account-details']}/${globalID}?action=billingAddress`,
      { data: payload, headers: authHeaders() },
    );

    expect(response.status()).toBe(500);
  });

  test('TC-BILL-05| Verify edit billing address with non-US address', async ({ request }) => {
    const payload = getNonUSBillingAddressPayload();
    const response = await request.patch(
      `${baseUrl}${apiPaths['update-customer-account-details']}/${globalID}?action=billingAddress`,
      { data: payload, headers: authHeaders() },
    );
    expect(response.status()).toBe(500);
  });
});
