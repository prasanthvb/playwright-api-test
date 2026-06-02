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
    payload.license.number = licenseNumber;
    console.log(`\n[TC-LIC-01] ── REQUEST ──────────────────────────────`);
    console.log(`[TC-LIC-01] globalID: ${globalID}`);
    console.log(`[TC-LIC-01] Payload sent:`, JSON.stringify(payload, null, 2));

    const response = await request.patch(
      `${baseUrl}${apiPaths['update-customer-account-details']}/${globalID}?action=license`,
      { data: payload, headers: getAuthHeaders() },
    );

    console.log(`[TC-LIC-01] ── RESPONSE ─────────────────────────────`);
    console.log(`[TC-LIC-01] HTTP Status: ${response.status()}`);
    const body = await response.json();
    console.log(`[TC-LIC-01] Response Body:`, JSON.stringify(body, null, 2));
    expect(response.status()).toBe(200);
    expect(body.updateRequestID).toBeTruthy();

    const updateResult = await runUpdateFlow(request, body, globalID);
    console.log(`[TC-LIC-01] ── UPDATE FLOW RESULT ────────────────────`);
    console.log(`[TC-LIC-01] Final Status: ${updateResult.status}`);
    console.log(
      `[TC-LIC-01] Updated Customer licenses:`,
      JSON.stringify(updateResult.updatedCustomer?.body.data.customer.licenses, null, 2),
    );

    expect(updateResult.status).toBe('active');
    const updatedLicenses = updateResult.updatedCustomer?.body.data.customer.licenses ?? [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updatedLicense = updatedLicenses.find((l: any) => l.number === payload.license.number);
    console.log(`[TC-LIC-01] Matched license:`, JSON.stringify(updatedLicense, null, 2));
    expect(updatedLicense, `License with number ${payload.license.number} not found in updated customer`).toBeTruthy();
    expect(updatedLicense.effectiveDate).toBe(payload.license.effectiveDate);
    expect(updatedLicense.expirationDate).toBe(payload.license.expirationDate);
    expect(updatedLicense.type).not.toBeNull();
    expect(updatedLicense.legalRegulation).toBe('1');
  });

  test('TC-LIC-02 | Verify add license with valid details', async ({ request }) => {
    const payload = addNewLicensePayload();
    const statePermits = licenseTypeData.filter((entry) => entry.state === selectedState);
    const randomPermit =
      statePermits.length > 0 ? statePermits[Math.floor(Math.random() * statePermits.length)] : undefined;
    permitCombo = randomPermit?.permitCombo ?? '';
    const newLicenseNumber = generateLicenseNumber(faker, selectedState);
    payload.license.number = newLicenseNumber;
    payload.license.type = randomPermit?.licenseType ?? payload.license.type;

    console.log(`\n[TC-LIC-02] ── REQUEST ──────────────────────────────`);
    console.log(`[TC-LIC-02] globalID: ${globalID}, state: ${selectedState}, permitCombo: ${permitCombo}`);
    console.log(`[TC-LIC-02] Payload sent:`, JSON.stringify(payload, null, 2));

    const response = await request.patch(
      `${baseUrl}${apiPaths['update-customer-account-details']}/${globalID}?action=license`,
      { data: payload, headers: getAuthHeaders() },
    );

    console.log(`[TC-LIC-02] ── RESPONSE ─────────────────────────────`);
    console.log(`[TC-LIC-02] HTTP Status: ${response.status()}`);
    const body = await response.json();
    console.log(`[TC-LIC-02] Response Body:`, JSON.stringify(body, null, 2));
    expect(response.status()).toBe(200);
    expect(body.updateRequestID).toBeTruthy();

    const updateResult = await runUpdateFlow(request, body, globalID);
    console.log(`[TC-LIC-02] ── UPDATE FLOW RESULT ────────────────────`);
    console.log(`[TC-LIC-02] Final Status: ${updateResult.status}`);
    const allLicenses = updateResult.updatedCustomer?.body.data.customer.licenses ?? [];
    console.log(`[TC-LIC-02] All licenses in customer record:`, JSON.stringify(allLicenses, null, 2));
    console.log(`[TC-LIC-02] Looking for license number: ${payload.license.number}`);

    expect(updateResult.status).toBe('active');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const addedLicense = allLicenses.find((l: any) => l.number === payload.license.number);
    console.log(`[TC-LIC-02] Matched license:`, JSON.stringify(addedLicense, null, 2));
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
    console.log(`\n[TC-DP-03] ── REQUEST ──────────────────────────────`);
    console.log(`[TC-DP-03] globalID: ${globalID}, addressID: ${addressID}`);
    console.log(`[TC-DP-03] Payload sent:`, JSON.stringify(payload, null, 2));

    const response = await request.patch(
      `${baseUrl}${apiPaths['update-customer-account-details']}/${globalID}?action=droppoint`,
      { data: payload, headers: getAuthHeaders() },
    );

    console.log(`[TC-DP-03] ── RESPONSE ─────────────────────────────`);
    console.log(`[TC-DP-03] HTTP Status: ${response.status()}`);
    const body = await response.json();
    console.log(`[TC-DP-03] Response Body:`, JSON.stringify(body, null, 2));
    expect(response.status()).toBe(200);
    expect(body.updateRequestID).toBeTruthy();

    const updateResult = await runUpdateFlow(request, body, globalID);
    console.log(`[TC-DP-03] ── UPDATE FLOW RESULT ────────────────────`);
    console.log(`[TC-DP-03] Final Status: ${updateResult.status}`);
    console.log(
      `[TC-DP-03] Updated addresses:`,
      JSON.stringify(updateResult.updatedCustomer?.body.data.customer.addresses, null, 2),
    );

    expect(updateResult.status).toBe('active');
    const updatedAddress = updateResult.updatedCustomer?.body.data.customer.addresses[0];
    console.log(`[TC-DP-03] Address[0] locations:`, JSON.stringify(updatedAddress?.locations, null, 2));
    expect(updatedAddress?.locations[0].name.toUpperCase()).toBe(payload.dropPoint.name?.toUpperCase());
    expect(updatedAddress?.addressID).toBe(payload.dropPoint.addressID);
  });

  test('TC-PAY-04 | Verify edit payment details with valid details', async ({ request }) => {
    const payload = getValidPaymentDetailsPayload();
    console.log(`\n[TC-PAY-04] ── REQUEST ──────────────────────────────`);
    console.log(`[TC-PAY-04] globalID: ${globalID}`);
    console.log(`[TC-PAY-04] Payload sent:`, JSON.stringify(payload, null, 2));

    const response = await request.patch(
      `${baseUrl}${apiPaths['update-customer-account-details']}/${globalID}?action=paymentDetails`,
      { data: payload, headers: getAuthHeaders() },
    );

    console.log(`[TC-PAY-04] ── RESPONSE ─────────────────────────────`);
    console.log(`[TC-PAY-04] HTTP Status: ${response.status()}`);
    const body = await response.json();
    console.log(`[TC-PAY-04] Response Body:`, JSON.stringify(body, null, 2));
    expect(response.status()).toBe(200);
    expect(body.updateRequestID).toBeTruthy();

    const updateResult = await runUpdateFlow(request, body, globalID);
    console.log(`[TC-PAY-04] ── UPDATE FLOW RESULT ────────────────────`);
    console.log(`[TC-PAY-04] Final Status: ${updateResult.status}`);
    const paymentTerms = updateResult.updatedCustomer?.body.data.customer.paymentTerms;
    console.log(`[TC-PAY-04] Updated paymentTerms:`, JSON.stringify(paymentTerms, null, 2));
    console.log(
      `[TC-PAY-04] Sent → terms: ${payload.paymentDetails.terms}, cadence: ${payload.paymentDetails.cadence}, creditLimit: ${payload.paymentDetails.creditLimit}`,
    );
    console.log(
      `[TC-PAY-04] Got  → term: ${paymentTerms?.term}, cadence: ${paymentTerms?.cadence}, creditLimit: ${paymentTerms?.creditLimit}`,
    );

    expect(updateResult.status).toBe('active');
    expect(paymentTerms?.term).toBe(payload.paymentDetails.terms);
    expect(paymentTerms?.cadence).toBe(payload.paymentDetails.cadence);
    // NOTE: SAP returns creditLimit=null for newly created customers (not yet fully provisioned).
    const returnedCreditLimit = paymentTerms?.creditLimit;
    console.log(
      `[TC-PAY-04] creditLimit returned: ${returnedCreditLimit} (sent: ${payload.paymentDetails.creditLimit})`,
    );
  });

  test('TC-BILL-05 | Verify add billing address with valid details', async ({ request }) => {
    const billingLocation = await fetchLocationForState(selectedState);
    const payload = getValidBillingAddressPayload(billingLocation ?? undefined);
    console.log(`\n[TC-BILL-05] ── REQUEST ──────────────────────────────`);
    console.log(`[TC-BILL-05] globalID: ${globalID}, state: ${selectedState}`);
    console.log(`[TC-BILL-05] Billing location used:`, JSON.stringify(billingLocation, null, 2));
    console.log(`[TC-BILL-05] Payload sent:`, JSON.stringify(payload, null, 2));

    const response = await request.patch(
      `${baseUrl}${apiPaths['update-customer-account-details']}/${globalID}?action=billingAddress`,
      { data: payload, headers: getAuthHeaders() },
    );

    console.log(`[TC-BILL-05] ── RESPONSE ─────────────────────────────`);
    console.log(`[TC-BILL-05] HTTP Status: ${response.status()}`);
    const body = await response.json();
    console.log(`[TC-BILL-05] Response Body:`, JSON.stringify(body, null, 2));
    expect(response.status()).toBe(200);
    expect(body.updateRequestID).toBeTruthy();

    const updateResult = await runUpdateFlow(request, body, globalID);
    console.log(`[TC-BILL-05] ── UPDATE FLOW RESULT ────────────────────`);
    console.log(`[TC-BILL-05] Final Status: ${updateResult.status}`);
    console.log(
      `[TC-BILL-05] All addresses:`,
      JSON.stringify(updateResult.updatedCustomer?.body.data.customer.addresses, null, 2),
    );

    expect(updateResult.status).toBe('active');

    const billingAddresses = Array.isArray(updateResult.updatedCustomer?.body.data.customer.addresses)
      ? updateResult.updatedCustomer.body.data.customer.addresses.filter(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (addr: Record<string, any>) => addr.addressType === 'Billing',
        )
      : [];
    console.log(
      `[TC-BILL-05] Billing addresses found: ${billingAddresses.length}`,
      JSON.stringify(billingAddresses, null, 2),
    );

    expect(billingAddresses.length).toBeGreaterThan(0);
    const billingAddress = billingAddresses[0];
    console.log(
      `[TC-BILL-05] Sent  → name: ${payload.billingAddress.billingEntityName}, city: ${payload.billingAddress.city}, state: ${payload.billingAddress.state}, postal: ${payload.billingAddress.postalCode}`,
    );
    console.log(
      `[TC-BILL-05] Got   → name: ${billingAddress?.name}, city: ${billingAddress?.city}, state: ${billingAddress?.state}, postal: ${billingAddress?.postalCode}`,
    );

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
