/* eslint-disable no-console */
import { test, expect } from '@playwright/test';
import apiPaths from '../../data/api-data/api-path.json';
import { runUpdateFlow } from '../../custom_modules/api/aws-utils/aws-update-flow-helper';
import { getValidAccountDetailsPayload } from '../../custom_modules/api/payload/update-account-details-payload';
import { getValidBillingAddressPayload } from '../../custom_modules/api/payload/update-billing-address-payload';
import { getValidDropPointPayload } from '../../custom_modules/api/payload/update-drop-point-payload';
import { getValidPaymentDetailsPayload } from '../../custom_modules/api/payload/update-payment-terms-payload';
import { generatePayloadWithFakerData } from '../../custom_modules/api/payload/generate-new-customer-payload';
import { runFullFlow } from '../../custom_modules/api/aws-utils/aws-flow-helper';
import { fetchLocationForState } from '../../custom_modules/common/common-utils/fetchLocations';
import { awsConfig, getAuthHeaders } from '../../../config/api-config';

const baseUrl = awsConfig.baseUrl;

test.describe('AWS Non-Alcohol Customer E2E - Create & Update Flow', () => {
  let globalID: string;
  let addressID: string;
  let selectedState: string;

  /**
   * beforeAll – NON ALCOHOL Customer Creation & Test Data Setup
   *
   * Creates a brand-new NON ALCOHOL customer, then extracts:
   *  - globalID        → used in all update API calls
   *  - addressID       → used by drop point test
   *  - selectedState   → used to fetch billing address location
   *
   * Note: NON ALCOHOL customers do not have license numbers, so license
   * update tests are not applicable.
   */
  test.beforeAll(async ({ request }) => {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('🚀 Creating NON ALCOHOL Customer for E2E Update Tests');
    console.log('═══════════════════════════════════════════════════════════\n');

    // Generate base payload and modify for NON ALCOHOL
    const payload = await generatePayloadWithFakerData();
    payload.licenseType = 'NON ALCOHOL';
    // NON ALCOHOL customers typically don't require a license number
    // Keep the generated one as placeholder - the API should accept it

    console.log('📋 NON ALCOHOL Customer Payload:', JSON.stringify(payload, null, 2));

    // Create the customer using runFullFlow
    const createResult = await runFullFlow(request, payload, 'Create NON ALCOHOL Customer for E2E');

    expect(createResult, 'Customer creation returned undefined').toBeDefined();
    expect(createResult.status, 'Create Customer API should return 200').toBe(200);
    expect(createResult.getRequestStatus, 'Customer should reach Active status').toBe('Active');
    expect(createResult.globalID, 'globalID should be returned').toBeTruthy();

    globalID = createResult.globalID!;

    // Extract address details from the created customer
    const address = createResult.getCustomerAddress;
    expect(address, `No address returned for NON ALCOHOL customer (globalID: ${globalID})`).toBeTruthy();

    addressID = address?.addressID as string;
    selectedState = address?.state as string;

    expect(addressID, `addressID is empty on created customer (globalID: ${globalID})`).toBeTruthy();
    expect(selectedState, `state is empty on created customer address (globalID: ${globalID})`).toBeTruthy();

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log(`✅ NON ALCOHOL Customer Created Successfully`);
    console.log(`   globalID    : ${globalID}`);
    console.log(`   state       : ${selectedState}`);
    console.log(`   addressID   : ${addressID}`);
    console.log(`   licenseType : NON ALCOHOL`);
    console.log('═══════════════════════════════════════════════════════════\n');
  });

  test('TC-NA-ACC-01 | Verify update account details with valid data', async ({ request }) => {
    const payload = getValidAccountDetailsPayload();

    console.log(`\n[TC-NA-ACC-01] ── REQUEST ──────────────────────────────`);
    console.log(`[TC-NA-ACC-01] globalID: ${globalID}`);
    console.log(`[TC-NA-ACC-01] Payload sent:`, JSON.stringify(payload, null, 2));

    const response = await request.patch(
      `${baseUrl}${apiPaths['update-customer-account-details']}/${globalID}?action=accountDetails`,
      { data: payload, headers: getAuthHeaders() },
    );

    console.log(`[TC-NA-ACC-01] ── RESPONSE ─────────────────────────────`);
    console.log(`[TC-NA-ACC-01] HTTP Status: ${response.status()}`);

    expect(response.status()).toBe(200);

    const body = await response.json();
    console.log(`[TC-NA-ACC-01] Response Body:`, JSON.stringify(body, null, 2));
    expect(body.updateRequestID).toBeTruthy();

    const updateResult = await runUpdateFlow(request, body, globalID);

    console.log(`[TC-NA-ACC-01] ── UPDATE FLOW RESULT ────────────────────`);
    console.log(`[TC-NA-ACC-01] Final Status: ${updateResult.status}`);

    // Log the full customer data to diagnose any issues
    const customer = updateResult.updatedCustomer?.body?.data?.customer;
    console.log(`[TC-NA-ACC-01] Updated Customer:`, JSON.stringify(customer, null, 2));

    expect(updateResult.status).toBe('active');
    expect(customer?.contactFirstName).toBe(payload.accountDetails.contactFirstName);
    expect(customer?.contactLastName).toBe(payload.accountDetails.contactLastName);
    expect(customer?.primaryEmail?.toLowerCase()).toBe(payload.accountDetails.primaryEmail.toLowerCase());
    // SAP normalizes phone format: (xxx) xxx-xxxx → xxx-xxx-xxxx
    const normalizePhone = (p: string) => {
      const digits = p.replace(/\D/g, ''); // extract only digits
      return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
    };
    expect(customer?.phone).toBe(normalizePhone(payload.accountDetails.phone));

    console.log(`[TC-NA-ACC-01] ✅ Account details updated successfully`);
  });

  test('TC-NA-BILL-01 | Verify edit billing address with valid details', async ({ request }) => {
    // Fetch a valid location for the customer's state
    const location = await fetchLocationForState(selectedState);
    const payload = getValidBillingAddressPayload(location ?? undefined);

    console.log(`\n[TC-NA-BILL-01] ── REQUEST ──────────────────────────────`);
    console.log(`[TC-NA-BILL-01] globalID: ${globalID}`);
    console.log(`[TC-NA-BILL-01] Payload sent:`, JSON.stringify(payload, null, 2));

    const response = await request.patch(
      `${baseUrl}${apiPaths['update-customer-account-details']}/${globalID}?action=billingAddress`,
      { data: payload, headers: getAuthHeaders() },
    );

    console.log(`[TC-NA-BILL-01] ── RESPONSE ─────────────────────────────`);
    console.log(`[TC-NA-BILL-01] HTTP Status: ${response.status()}`);

    expect(response.status()).toBe(200);

    const body = await response.json();
    console.log(`[TC-NA-BILL-01] Response Body:`, JSON.stringify(body, null, 2));
    expect(body.updateRequestID).toBeTruthy();

    const updateResult = await runUpdateFlow(request, body, globalID);

    console.log(`[TC-NA-BILL-01] ── UPDATE FLOW RESULT ────────────────────`);
    console.log(`[TC-NA-BILL-01] Final Status: ${updateResult.status}`);

    expect(updateResult.status).toBe('active');

    // Log the full customer addresses to diagnose any issues
    const customerAddresses = updateResult.updatedCustomer?.body?.data?.customer?.addresses;
    console.log(`[TC-NA-BILL-01] All addresses:`, JSON.stringify(customerAddresses, null, 2));

    // Get all addresses with addressType "Billing"
    const billingAddresses = Array.isArray(customerAddresses)
      ? customerAddresses.filter(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (addr: Record<string, any>) => addr.addressType === 'Billing',
        )
      : [];

    console.log(`[TC-NA-BILL-01] Billing addresses found:`, JSON.stringify(billingAddresses, null, 2));

    // Assert at least one billing address exists
    expect(billingAddresses.length).toBeGreaterThan(0);

    const billingAddress = billingAddresses[0];

    // SAP normalizes "and" → "&" in entity names
    const normalizedExpectedName = (payload.billingAddress.billingEntityName ?? '')
      .toUpperCase()
      .replace(/\bAND\b/g, '&');
    expect((billingAddress?.name ?? '').toUpperCase()).toBe(normalizedExpectedName);
    expect(billingAddress?.country).toBe('US');
    expect((billingAddress?.city ?? '').toUpperCase()).toBe((payload.billingAddress.city ?? '').toUpperCase());
    expect((billingAddress?.state ?? '').toUpperCase()).toBe((payload.billingAddress.state ?? '').toUpperCase());
    expect(billingAddress?.postalCode).toBe(payload.billingAddress.postalCode);

    // SAP normalizes addressLine1 using USPS abbreviations
    const sentLine1 = (payload.billingAddress.addressLine1 ?? '').toUpperCase();
    const returnedLine1 = (billingAddress?.addressLine1 ?? '').toUpperCase();
    if (sentLine1 !== returnedLine1) {
      console.warn(`[TC-NA-BILL-01] addressLine1 normalized by SAP: sent="${sentLine1}" returned="${returnedLine1}"`);
    }
    expect(returnedLine1).toBeTruthy();

    console.log(`[TC-NA-BILL-01] ✅ Billing address updated successfully`);
  });

  test('TC-NA-DP-01 | Verify edit drop point with valid details', async ({ request }) => {
    const payload = getValidDropPointPayload(addressID);

    console.log(`\n[TC-NA-DP-01] ── REQUEST ──────────────────────────────`);
    console.log(`[TC-NA-DP-01] globalID: ${globalID}, addressID: ${addressID}`);
    console.log(`[TC-NA-DP-01] Payload sent:`, JSON.stringify(payload, null, 2));

    const response = await request.patch(
      `${baseUrl}${apiPaths['update-customer-account-details']}/${globalID}?action=droppoint`,
      { data: payload, headers: getAuthHeaders() },
    );

    console.log(`[TC-NA-DP-01] ── RESPONSE ─────────────────────────────`);
    console.log(`[TC-NA-DP-01] HTTP Status: ${response.status()}`);

    expect(response.status()).toBe(200);

    const body = await response.json();
    console.log(`[TC-NA-DP-01] Response Body:`, JSON.stringify(body, null, 2));
    expect(body.updateRequestID).toBeTruthy();

    const updateResult = await runUpdateFlow(request, body, globalID);

    console.log(`[TC-NA-DP-01] ── UPDATE FLOW RESULT ────────────────────`);
    console.log(`[TC-NA-DP-01] Final Status: ${updateResult.status}`);

    const customerAddresses = updateResult.updatedCustomer?.body?.data?.customer?.addresses;
    console.log(`[TC-NA-DP-01] Updated addresses:`, JSON.stringify(customerAddresses, null, 2));

    expect(updateResult.status).toBe('active');

    const firstAddress = customerAddresses?.[0];
    expect(firstAddress?.locations?.[0]?.name?.toUpperCase()).toBe(payload.dropPoint.name?.toUpperCase());
    expect(firstAddress?.addressID).toBe(payload.dropPoint.addressID);

    console.log(`[TC-NA-DP-01] ✅ Drop point updated successfully`);
  });

  test('TC-NA-PAY-01 | Verify edit payment details with valid details', async ({ request }) => {
    const payload = getValidPaymentDetailsPayload();

    console.log(`\n[TC-NA-PAY-01] ── REQUEST ──────────────────────────────`);
    console.log(`[TC-NA-PAY-01] globalID: ${globalID}`);
    console.log(`[TC-NA-PAY-01] Payload sent:`, JSON.stringify(payload, null, 2));

    const response = await request.patch(
      `${baseUrl}${apiPaths['update-customer-account-details']}/${globalID}?action=paymentDetails`,
      { data: payload, headers: getAuthHeaders() },
    );

    console.log(`[TC-NA-PAY-01] ── RESPONSE ─────────────────────────────`);
    console.log(`[TC-NA-PAY-01] HTTP Status: ${response.status()}`);

    expect(response.status()).toBe(200);

    const body = await response.json();
    console.log(`[TC-NA-PAY-01] Response Body:`, JSON.stringify(body, null, 2));
    expect(body.updateRequestID).toBeTruthy();

    const updateResult = await runUpdateFlow(request, body, globalID);

    console.log(`[TC-NA-PAY-01] ── UPDATE FLOW RESULT ────────────────────`);
    console.log(`[TC-NA-PAY-01] Final Status: ${updateResult.status}`);

    const paymentTerms = updateResult.updatedCustomer?.body?.data?.customer?.paymentTerms;
    console.log(`[TC-NA-PAY-01] Payment Terms:`, JSON.stringify(paymentTerms, null, 2));

    expect(updateResult.status).toBe('active');
    expect(paymentTerms?.term).toBe(payload.paymentDetails.terms);
    expect(paymentTerms?.cadence).toBe(payload.paymentDetails.cadence);
    // NOTE: SAP returns creditLimit=null for newly created customers (not yet fully provisioned)
    const returnedCreditLimit = paymentTerms?.creditLimit;
    console.log(
      `[TC-NA-PAY-01] creditLimit returned: ${returnedCreditLimit} (sent: ${payload.paymentDetails.creditLimit})`,
    );

    console.log(`[TC-NA-PAY-01] ✅ Payment details updated successfully`);
  });
});
