/* eslint-disable no-console */
import { test, expect } from '@playwright/test';
import { generateBrowseCustomerPayload } from '../../custom_modules/api/payload/generate-browse-customer-payloads';
import { browseCustomers } from '../../custom_modules/api/aws-utils/aws-api-helper';
import { awsConfig, getAuthHeaders } from '../../../config/api-config';
import apiPaths from '../../data/api-data/api-path.json';
import { runUpdateFlow } from '../../custom_modules/api/aws-utils/aws-update-flow-helper';
import { getValidLicensePayload } from '../../custom_modules/api/payload/update-licence-payload';
import { getValidDropPointPayload } from '../../custom_modules/api/payload/update-drop-point-payload';
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
  globalId: string;
  Address?: CustomerAddress[];
  licenses?: CustomerLicense[];
  Licenses?: CustomerLicense[];
  [key: string]: unknown;
}

test.describe('AWS Update Customers API - Databricks', () => {
  let globalID: string;

  let addressID: string;

  let licenseNumber: string;

  test.beforeAll(async ({ request }) => {
    const payload = generateBrowseCustomerPayload('databricks');
    const { response, body } = await browseCustomers(request, payload);
    expect(response.status()).toBe(200);
    expect(Array.isArray(body.records)).toBeTruthy();
    expect(body.records?.length, 'No records returned from browse-customers (databricks)').toBeGreaterThan(0);

    const activeRecords = body.records.filter(
      (r: CustomerRecord) => r.status?.toLowerCase() === 'active' && r.source?.toLowerCase() === 'import',
    );
    console.log(`Total records: ${body.records.length}, Active import records: ${activeRecords.length}`);
    expect(activeRecords.length, 'No active import records found in browse response').toBeGreaterThan(0);

    // Choose any one of the active records
    const selectedRecord = activeRecords[Math.floor(Math.random() * activeRecords.length)];
    globalID = selectedRecord.globalID;

    // Process Addresses — pick one randomly
    const addresses = selectedRecord.Address || [];
    expect(addresses.length, `No addresses found on selected record (globalID: ${globalID})`).toBeGreaterThan(0);
    const selectedAddress = addresses[Math.floor(Math.random() * addresses.length)];
    expect(selectedAddress.state).toBe(payload.state);
    addressID = selectedAddress.addressID as string;
    expect(addressID, `addressID is empty on selected address (globalID: ${globalID})`).toBeTruthy();

    // Process Licenses — pick one randomly
    const licenses = selectedRecord.licenses || [];
    expect(licenses.length, `No licenses found on selected record (globalID: ${globalID})`).toBeGreaterThan(0);
    const selectedLicense = licenses[Math.floor(Math.random() * licenses.length)];
    licenseNumber = selectedLicense.number as string;
    expect(licenseNumber, `licenseNumber is empty on selected license (globalID: ${globalID})`).toBeTruthy();
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

  test('TC-LIC-02 | Verify edit drop point with valid details', async ({ request }) => {
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
});
