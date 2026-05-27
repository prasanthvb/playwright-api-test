/* eslint-disable no-console */
import { test, expect } from '@playwright/test';
import path from 'path';
import apiPaths from '../../data/api-data/api-path.json';
import { createBaselineWithRetry } from '../../custom_modules/api/aws-utils/aws-create-update-baseline-helper';
import { runUpdateFlow } from '../../custom_modules/api/aws-utils/aws-update-flow-helper';
import { addNewLicensePayload, getValidLicensePayload } from '../../custom_modules/api/payload/update-licence-payload';
import { getValidDropPointPayload } from '../../custom_modules/api/payload/update-drop-point-payload';
import licenseTypeData from '../../data/api-data/licenseType.json';
import { faker } from '@faker-js/faker';
import { generateLicenseNumber } from '../../custom_modules/common/common-utils/licenseUtils';
import { getValidPaymentDetailsPayload } from '@src/custom_modules/api/payload/update-payment-terms-payload';
import { getValidBillingAddressPayload } from '@src/custom_modules/api/payload/update-billing-address-payload';
import { fetchLocationForState } from '../../custom_modules/common/common-utils/fetchLocations';
import { awsConfig, getAuthHeaders } from '../../../config/api-config';

const baseUrl = awsConfig.baseUrl;
const baselineFilePath = path.join(process.cwd(), 'src/data/update-baseline/new-customer-e2e.json');

test.describe('AWS Update Customers API - New Customer E2E', () => {
  let globalID: string;
  let addressID: string;
  let licenseNumber: string;
  let selectedState: string;
  let permitCombo: string;

  /**
   * beforeAll – New Customer Creation & Test Data Setup
   *
   * Creates a brand-new customer via the baseline helper, then extracts:
   *  - globalID        → used in all update API calls
   *  - addressID       → used by drop point test (TC-DP-03)
   *  - licenseNumber   → used by license edit test (TC-LIC-01)
   *  - selectedState   → used to look up permit combos and fetch billing address
   */
  test.beforeAll(async ({ request }) => {
    const baselineResult = await createBaselineWithRetry(request, baselineFilePath, 3);
    expect(baselineResult, 'Baseline customer creation failed after all retries').toBeTruthy();

    globalID = baselineResult!.globalID!;
    expect(globalID, 'globalID not returned from baseline creation').toBeTruthy();

    // Extract address details from the created customer
    const address = baselineResult!.getCustomerAddress;
    expect(address, `No address returned for new customer (globalID: ${globalID})`).toBeTruthy();

    addressID = address?.addressID as string;
    selectedState = address?.state as string;
    expect(addressID, `addressID is empty on created customer (globalID: ${globalID})`).toBeTruthy();
    expect(selectedState, `state is empty on created customer address (globalID: ${globalID})`).toBeTruthy();

    // Extract license number from the baseline creation flow
    licenseNumber = baselineResult!.licenceNumber as string;
    expect(licenseNumber, `licenseNumber not returned from baseline creation (globalID: ${globalID})`).toBeTruthy();

    console.log(
      `[beforeAll] Created new customer — globalID: ${globalID}, state: ${selectedState}, addressID: ${addressID}, licenseNumber: ${licenseNumber}`,
    );
  });
  test('TC-LIC-01 | Verify edit license with valid details', async ({ request }) => {
    const payload = getValidLicensePayload();
    payload.license.number = licenseNumber; // Use existing license number
    const response = await request.patch(
      `${baseUrl}${apiPaths['update-customer-account-details']}/${globalID}?action=license`,
      { data: payload, headers: getAuthHeaders() },
    );

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.updateRequestID).toBeTruthy();

    const updateResult = await runUpdateFlow(request, body, globalID);

    expect(updateResult.status).toBe('active');
    // Find the updated license by its number (not by index)
    const updatedLicenses = updateResult.updatedCustomer?.body.data.customer.licenses ?? [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updatedLicense = updatedLicenses.find((l: any) => l.number === payload.license.number);
    expect(updatedLicense, `License with number ${payload.license.number} not found in updated customer`).toBeTruthy();
    expect(updatedLicense.effectiveDate).toBe(payload.license.effectiveDate);
    expect(updatedLicense.expirationDate).toBe(payload.license.expirationDate);
    expect(updatedLicense.type).not.toBeNull();
    expect(updatedLicense.legalRegulation).toBe('1');
  });

  test('TC-LIC-02 | Verify add license with valid details', async ({ request }) => {
    const payload = addNewLicensePayload();

    // Pick a random permit combo for the selected state from licenseType.json
    const statePermits = licenseTypeData.filter((entry) => entry.state === selectedState);
    const randomPermit =
      statePermits.length > 0 ? statePermits[Math.floor(Math.random() * statePermits.length)] : undefined;
    permitCombo = randomPermit?.permitCombo ?? '';
    console.log(`Selected state: ${selectedState}, permitCombo: ${permitCombo}`);
    const newLicenseNumber = generateLicenseNumber(faker, selectedState);
    payload.license.number = newLicenseNumber; // Generated license number based on state-specific format
    payload.license.type = randomPermit?.licenseType ?? payload.license.type;
    const response = await request.patch(
      `${baseUrl}${apiPaths['update-customer-account-details']}/${globalID}?action=license`,
      { data: payload, headers: getAuthHeaders() },
    );

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.updateRequestID).toBeTruthy();

    const updateResult = await runUpdateFlow(request, body, globalID);

    expect(updateResult.status).toBe('active');
    // Find the newly added license by its number (not by index)
    const allLicenses = updateResult.updatedCustomer?.body.data.customer.licenses ?? [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const addedLicense = allLicenses.find((l: any) => l.number === payload.license.number);
    expect(
      addedLicense,
      `Added license with number ${payload.license.number} not found in updated customer`,
    ).toBeTruthy();
    expect(addedLicense.effectiveDate).toBe(payload.license.effectiveDate);
    expect(addedLicense.expirationDate).toBe(payload.license.expirationDate);
    expect(addedLicense.type).not.toBeNull();
    expect(addedLicense.legalRegulation).toBe('1');
  });

  test('TC-DP-03 | Verify add drop point with valid details', async ({ request }) => {
    const payload = getValidDropPointPayload(addressID);
    console.log('Payload for Drop Point Update:', JSON.stringify(payload, null, 2));
    const response = await request.patch(
      `${baseUrl}${apiPaths['update-customer-account-details']}/${globalID}?action=droppoint`,
      { data: payload, headers: getAuthHeaders() },
    );

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.updateRequestID).toBeTruthy();
    console.log(body);

    const updateResult = await runUpdateFlow(request, body, globalID);

    expect(updateResult.status).toBe('active');
    console.log(JSON.stringify(updateResult.updatedCustomer?.body.data.customer.addresses[0], null, 2));
    console.log(JSON.stringify(payload.dropPoint, null, 2));
    expect(updateResult.updatedCustomer?.body.data.customer.addresses[0].locations[0].name.toUpperCase()).toBe(
      payload.dropPoint.name?.toUpperCase(),
    );
    expect(updateResult.updatedCustomer?.body.data.customer.addresses[0].addressID).toBe(payload.dropPoint.addressID);
  });

  test('TC-PAY-04 | Verify edit payment details with valid details', async ({ request }) => {
    const payload = getValidPaymentDetailsPayload();
    const response = await request.patch(
      `${baseUrl}${apiPaths['update-customer-account-details']}/${globalID}?action=paymentDetails`,
      { data: payload, headers: getAuthHeaders() },
    );

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.updateRequestID).toBeTruthy();

    const updateResult = await runUpdateFlow(request, body, globalID);

    expect(updateResult.status).toBe('active');
    expect(updateResult.updatedCustomer?.body.data.customer.paymentTerms.term).toBe(payload.paymentDetails.terms);
    expect(updateResult.updatedCustomer?.body.data.customer.paymentTerms.cadence).toBe(payload.paymentDetails.cadence);
    expect(updateResult.updatedCustomer?.body.data.customer.paymentTerms.creditLimit).toBe(
      payload.paymentDetails.creditLimit,
    );
  });

  test('TC-BILL-05 | Verify add billing address with valid details', async ({ request }) => {
    const billingLocation = await fetchLocationForState(selectedState);
    const payload = getValidBillingAddressPayload(billingLocation ?? undefined);
    console.log(
      `[TC-BILL-05] Using billing address for state ${selectedState}:`,
      JSON.stringify(billingLocation, null, 2),
    );
    const response = await request.patch(
      `${baseUrl}${apiPaths['update-customer-account-details']}/${globalID}?action=billingAddress`,
      { data: payload, headers: getAuthHeaders() },
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
});
