/* eslint-disable no-console */
import { test, expect } from '@playwright/test';
import { generateBrowseCustomerPayload } from '../../custom_modules/api/payload/generate-browse-customer-payloads';
import { browseCustomers } from '../../custom_modules/api/aws-utils/aws-api-helper';
import { awsConfig, getAuthHeaders } from '../../../config/api-config';
import apiPaths from '../../data/api-data/api-path.json';
import { runUpdateFlow } from '../../custom_modules/api/aws-utils/aws-update-flow-helper';
import { addNewLicensePayload, getValidLicensePayload } from '../../custom_modules/api/payload/update-licence-payload';
import { getValidDropPointPayload } from '../../custom_modules/api/payload/update-drop-point-payload';
import licenseTypeData from '../../data/api-data/licenseType.json';
import { faker } from '@faker-js/faker';
import { generateLicenseNumber } from '../../custom_modules/common/common-utils/licenseUtils';
import { getValidPaymentDetailsPayload } from '@src/custom_modules/api/payload/update-payment-terms-payload';
import { getValidBillingAddressPayload } from '@src/custom_modules/api/payload/update-billing-address-payload';
import { fetchLocationForState } from '../../custom_modules/common/common-utils/fetchLocations';
const baseUrl = awsConfig.baseUrl;

interface CustomerAddress {
  state?: string;
  id?: string;
  addressId?: string;
}

interface CustomerLicense {
  number?: string;
  alcoholLicenseNumber?: string;
  licenseNumber?: string;
}

interface CustomerRecord {
  source?: string;
  status?: string;
  globalId?: string;
  globalID?: string;
  Address?: CustomerAddress[];
  licenses?: CustomerLicense[];
  Licenses?: CustomerLicense[];
  [key: string]: unknown;
}

test.describe('AWS Update Customers API - Databricks', () => {
  let globalID: string;
  let addressID: string;
  let licenseNumber: string;
  let selectedState: string;
  let permitCombo: string;

  /**
   * beforeAll – Test Data Setup
   *
   * Runs once before all tests in this describe block.
   * Performs the following steps:
   *
   * 1. Calls the Browse Customers API with a 'databricks' payload (postgres mode,
   *    sorted by time descending, page size 200) to retrieve a list of customers.
   * 2. Filters the returned records to only those with status = 'active'
   *    and source = 'import_c360' (i.e. customers imported via Databricks).
   * 3. Randomly selects one qualifying customer record.
   * 4. Extracts a random address from that record and stores its `addressID`
   *    — used by the drop point update test (TC-LIC-02).
   * 5. Extracts a random license from that record and stores its `number`
   *    — used by the license edit test (TC-LIC-01).
   * 6. Asserts that the selected address belongs to the same state as the
   *    browse payload, and that both addressID and licenseNumber are non-empty.
   *
   * If no active import records, addresses, or licenses are found, the setup
   * fails fast with a descriptive assertion message before any test runs.
   */
  test.beforeAll(async ({ request }) => {
    const payload = generateBrowseCustomerPayload('databricks');
    const { response, body } = await browseCustomers(request, payload);
    expect(response.status()).toBe(200);
    expect(Array.isArray(body.records)).toBeTruthy();
    expect(body.records?.length, 'No records returned from browse-customers (databricks)').toBeGreaterThan(0);

    const activeRecords = body.records.filter(
      (r: CustomerRecord) => r.status?.toLowerCase() === 'active' && r.source?.toLowerCase() === 'import_c360',
    );
    console.log(`Total records: ${body.records.length}, Active import records: ${activeRecords.length}`);
    expect(activeRecords.length, 'No active import records found in browse response').toBeGreaterThan(0);

    // Shuffle to randomize the order we try
    const shuffled = [...activeRecords].sort(() => Math.random() - 0.5);

    let found = false;
    for (const record of shuffled) {
      const candidateID = (record.globalID ?? record.globalId) as string;
      if (!candidateID) continue;

      // partnerEntityID check removed — import_c360 customers are real existing customers,
      // no SAP pre-check needed. If an update fails, the test will surface the error directly.
      const addresses = record.Address || [];
      const licenses = record.licenses || [];
      if (addresses.length === 0 || licenses.length === 0) {
        console.log(`[beforeAll] Skipping ${candidateID} — missing addresses or licenses`);
        continue;
      }

      const selectedAddress = addresses[Math.floor(Math.random() * addresses.length)];
      const selectedLicense = licenses[Math.floor(Math.random() * licenses.length)];

      if (!selectedAddress.state || !selectedAddress.addressID || !selectedLicense.number) {
        console.log(`[beforeAll] Skipping ${candidateID} — missing address/license fields`);
        continue;
      }

      // All checks passed — use this record
      globalID = candidateID;
      selectedState = selectedAddress.state as string;
      addressID = selectedAddress.addressID as string;
      licenseNumber = selectedLicense.number as string;
      console.log(
        `[beforeAll] Selected globalID: ${globalID}, state: ${selectedState}, addressID: ${addressID}, licenseNumber: ${licenseNumber}`,
      );
      found = true;
      break;
    }

    expect(found, 'No valid SAP-provisioned active import record found in browse response').toBeTruthy();
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
    // NOTE: SAP does not update effectiveDate/expirationDate or legalRegulation for import_c360 customers
    expect(updatedLicense.type).not.toBeNull();
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
    console.log(`[TC-LIC-02] All licenses after add (full):`, JSON.stringify(allLicenses, null, 2));
    console.log(
      `[TC-LIC-02] All licenses after add:`,
      JSON.stringify(allLicenses.map((l: CustomerLicense) => l.number)),
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const addedLicense = allLicenses.find((l: any) => l.number === payload.license.number);
    // NOTE: Backend known issue — add license returns Active but new license may not appear in the
    // customer record immediately. Log the actual licenses for diagnosis.
    if (!addedLicense) {
      console.warn(
        `[TC-LIC-02] KNOWN BACKEND ISSUE: License ${payload.license.number} not found after add. ` +
          `Existing licenses: ${JSON.stringify(allLicenses.map((l: CustomerLicense) => l.number))}`,
      );
    }
    expect(
      addedLicense,
      `Added license with number ${payload.license.number} not found in updated customer. ` +
        `Existing licenses: ${JSON.stringify(allLicenses.map((l: CustomerLicense) => l.number))}`,
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
    // creditLimit may be returned as string "9373.00" by SAP — compare as number
    expect(Number(updateResult.updatedCustomer?.body.data.customer.paymentTerms.creditLimit)).toBe(
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
