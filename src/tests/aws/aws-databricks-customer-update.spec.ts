import { test, expect } from '@playwright/test';
import { generateBrowseCustomerPayload } from '../../custom_modules/api/payload/generate-browse-customer-payloads';
import { browseCustomers } from '../../custom_modules/api/aws-utils/aws-api-helper';
import { awsConfig } from '../../../config/api-config';
import apiPaths from '../../data/api-data/api-path.json';
import { runUpdateFlow } from '../../custom_modules/api/aws-utils/aws-update-flow-helper';
import { getValidLicensePayload } from '../../custom_modules/api/payload/update-licence-payload';
const baseUrl = awsConfig.baseUrl;
const apiKey = awsConfig.apiKey;

// Helper to add API key header
function authHeaders() {
  return {
    'x-api-key': apiKey ?? '',
  };
}

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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let addressId: string;

  let licenseNumber: string;

  test.beforeAll(async ({ request }) => {
    const payload = generateBrowseCustomerPayload('databricks');
    const { response, body } = await browseCustomers(request, payload);
    expect(response.status()).toBe(200);
    expect(Array.isArray(body.records)).toBeTruthy();

    if (body.records?.length > 0) {
      // Iterate through the records and filter only the ones with status as active
      // Assuming 'status' could be 'Active' or 'active'
      const activeRecords = body.records.filter(
        (r: CustomerRecord) => r.source === 'databricks' && r.status?.toLowerCase() === 'Active',
      );

      if (activeRecords.length > 0) {
        // Choose any one of the active records
        const selectedRecord = activeRecords[Math.floor(Math.random() * activeRecords.length)];

        // Assign the globalId to the customerId variable
        globalID = selectedRecord.globalID;

        // Process Addresses
        const addresses = selectedRecord.Address || [];
        if (addresses.length > 0) {
          // If there are multiple addresses, choose only one randomly
          const selectedAddress = addresses[Math.floor(Math.random() * addresses.length)];

          // Assert Address[?].state
          expect(selectedAddress.state).toBe(payload.state);

          // Get the address id
          addressId = selectedAddress.addressID as string;
        }

        // Process Licenses
        const licenses = selectedRecord.licenses || [];
        if (licenses.length > 0) {
          // If there are multiple licenses, choose one randomly
          const selectedLicense = licenses[Math.floor(Math.random() * licenses.length)];
          // Get the number from it
          licenseNumber = selectedLicense.number as string;
        }
      }
    }
  });

  test('TC-LIC-01 | Verify edit license with valid details', async ({ request }) => {
    const payload = getValidLicensePayload();
    payload.license.number = licenseNumber; // Use existing license number
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
});
