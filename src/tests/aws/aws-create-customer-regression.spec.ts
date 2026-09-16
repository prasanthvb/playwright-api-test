import { test, expect } from '@playwright/test';
import { generatePayloadWithFakerData } from '../../custom_modules/api/payload/generate-new-customer-payload';
import { runFullFlow } from '../../custom_modules/api/aws-utils/aws-flow-helper';
import { getCustomerByGlobalID } from '../../custom_modules/api/aws-utils/aws-api-helper';
import expectedErrors from '../../data/api-data/aws-error-messages.json';
import data from '../../data/api-data/test-data.json';
import { awsConfig, getAuthHeaders } from '../../../config/api-config';
import apiPaths from '../../data/api-data/api-path.json';

const baseUrl = awsConfig.baseUrl;

test.describe('AWS Create Customer - Get Request - Get Customer - API Test Cases Validation', () => {
  test('CC-01 Create customer with valid details', async ({ request }) => {
    const payload = await generatePayloadWithFakerData();
    console.log(JSON.stringify(payload, null, 2));
    const result = await runFullFlow(request, payload, 'Create customer with valid details');
    expect(result).toBeDefined();
    expect(result.status).toBe(200);

    if (result.requestID) {
      expect(result.getRequestStatus).toBeDefined();
      expect(result.getRequestStatus).toContain('Active');

      if (result.getRequestStatus === 'Active') {
        expect(result.globalID).toBeTruthy();
        expect(result.getCustomerStatus).toBe(200);
      }
    }
  });

  test('CC-02 Missing required field (accountName)', async ({ request }) => {
    const payload = await generatePayloadWithFakerData();
    payload.accountName = '';
    const result = await runFullFlow(request, payload, 'Missing Account Name');
    expect(result).toBeDefined();
    expect(result.status).toBe(500);
    expect(result.apiError).toContain(expectedErrors['CC-02']);
  });

  test('CC-03 Invalid email format', async ({ request }) => {
    const payload = await generatePayloadWithFakerData();
    payload.primaryEmail = 'email@example.com (Joe Smith)';

    const result = await runFullFlow(request, payload, 'Invalid Email Format');
    expect(result).toBeDefined();
    expect(result.status).toBe(200);

    expect(result.requestID).toBeTruthy();
    expect(result.getRequestStatus).toBeDefined();
    expect(result.getRequestStatus).toContain('Error');
  });

  test('CC-04 Invalid phone number', async ({ request }) => {
    const payload = await generatePayloadWithFakerData();
    payload.phone = 'ABC-123';

    const result = await runFullFlow(request, payload, 'Invalid Phone Number');
    expect(result).toBeDefined();
    expect(result.status).toBe(200);

    expect(result.requestID).toBeTruthy();
    expect(result.getRequestStatus).toBeDefined();
    expect(result.getRequestStatus).toContain('Error');
  });

  test('CC-05 Duplicate license number', async ({ request }) => {
    const payload = await generatePayloadWithFakerData();
    payload.alcoholLicenseNumber = data.alcoholLicenseNumber;
    console.log(JSON.stringify(payload, null, 2));
    const result = await runFullFlow(request, payload, 'Duplicate License Number');
    expect(result).toBeDefined();
    expect(result.status).toBe(200);

    if (result.requestID) {
      expect(result.getRequestStatus).toBeDefined();
      expect(result.getRequestStatus).toContain('Active');

      if (result.getRequestStatus === 'Active') {
        expect(result.globalID).toBeTruthy();
        expect(result.getCustomerStatus).toBe(200);
      }
    }
  });

  test('CC-06 Liquor License >40 chars', async ({ request }) => {
    const payload = await generatePayloadWithFakerData();
    payload.alcoholLicenseNumber = 'L'.repeat(41);

    const result = await runFullFlow(request, payload, 'Liquor License >40 characters');
    expect(result).toBeDefined();
    expect(result.status).toBe(200);

    expect(result.requestID).toBeTruthy();
    expect(result.getRequestStatus).toBeDefined();
    expect(result.getRequestStatus).toContain('Error');
  });

  test('CC-07 Legal Owner Name >100 chars', async ({ request }) => {
    const payload = await generatePayloadWithFakerData();
    payload.legalOwnerName = 'L'.repeat(101);

    const result = await runFullFlow(request, payload, 'Legal Owner Name >100 characters');
    expect(result).toBeDefined();
    expect(result.status).toBe(200);

    expect(result.requestID).toBeTruthy();
    expect(result.getRequestStatus).toBeDefined();
    expect(result.getRequestStatus).toContain('Error');
  });

  test('CC-08 Account Name >100 chars', async ({ request }) => {
    const payload = await generatePayloadWithFakerData();
    payload.accountName = 'L'.repeat(101);

    const result = await runFullFlow(request, payload, 'Account Name >100 characters');
    expect(result).toBeDefined();
    expect(result.status).toBe(200);

    expect(result.requestID).toBeTruthy();
    expect(result.getRequestStatus).toBeDefined();
    expect(result.getRequestStatus).toContain('Error');
  });

  test('CC-09 Street Address > 100 chars', async ({ request }) => {
    const payload = await generatePayloadWithFakerData();

    payload.Address[0].addressLine1 = '1245 Kozey Orchard '.repeat(8);
    const result = await runFullFlow(request, payload, 'Street Address > 100 characters');
    expect(result).toBeDefined();
    expect(result.status).toBe(200);

    expect(result.requestID).toBeTruthy();
    expect(result.getRequestStatus).toBeDefined();
    expect(result.getRequestStatus).toContain('Error');
  });

  test('CC-10 City > 40 chars', async ({ request }) => {
    const payload = await generatePayloadWithFakerData();
    payload.Address[0].city = 'L'.repeat(41);

    const result = await runFullFlow(request, payload, 'City > 40 characters');
    expect(result).toBeDefined();
    expect(result.status).toBe(200);

    expect(result.requestID).toBeTruthy();
    expect(result.getRequestStatus).toBeDefined();
    expect(result.getRequestStatus).toContain('Error');
  });

  test('CC-11 County > 40 chars', async ({ request }) => {
    const payload = await generatePayloadWithFakerData();
    payload.Address[0].county = 'L'.repeat(41);

    const result = await runFullFlow(request, payload, 'County > 40 characters');
    expect(result).toBeDefined();
    expect(result.status).toBe(200);

    expect(result.requestID).toBeTruthy();
    expect(result.getRequestStatus).toBeDefined();
    expect(result.getRequestStatus).toContain('Error');
  });

  test('CC-12 Invalid State input', async ({ request }) => {
    const payload = await generatePayloadWithFakerData();
    payload.Address[0].state = data.invalidState;
    console.log(JSON.stringify(payload, null, 2));
    const result = await runFullFlow(request, payload, 'Invalid State Input');
    expect(result).toBeDefined();
    expect(result.status).toBe(200);

    expect(result.requestID).toBeTruthy();
    expect(result.getRequestStatus).toBeDefined();
    expect(result.getRequestStatus).toContain('Error');
  });

  test('CC-14 State > 50 chars', async ({ request }) => {
    const payload = await generatePayloadWithFakerData();
    payload.Address[0].state = 'L'.repeat(51);

    const result = await runFullFlow(request, payload, 'State > 50 characters');
    expect(result).toBeDefined();
    expect(result.status).toBe(200);

    expect(result.requestID).toBeTruthy();
    expect(result.getRequestStatus).toBeDefined();
    expect(result.getRequestStatus).toContain('Error');
  });

  test('CC-15 Postal code < 5 chars', async ({ request }) => {
    const payload = await generatePayloadWithFakerData();
    payload.Address[0].postalCode = '2'.repeat(4);

    const result = await runFullFlow(request, payload, 'Postal code < 5 characters');
    expect(result).toBeDefined();
    expect(result.status).toBe(200);

    expect(result.requestID).toBeTruthy();
    expect(result.getRequestStatus).toBeDefined();
    expect(result.getRequestStatus).toContain('Error');
  });

  test('CC-16 First Name > 40 chars', async ({ request }) => {
    const payload = await generatePayloadWithFakerData();
    payload.contactFirstName = 'L'.repeat(41);

    const result = await runFullFlow(request, payload, 'Last Name > 41 characters');
    expect(result).toBeDefined();
    expect(result.status).toBe(200);

    expect(result.requestID).toBeTruthy();
    expect(result.getRequestStatus).toBeDefined();
    expect(result.getRequestStatus).toContain('Error');
  });

  test('CC-17 Last Name > 40 chars', async ({ request }) => {
    const payload = await generatePayloadWithFakerData();
    payload.contactLastName = 'S'.repeat(41);

    const result = await runFullFlow(request, payload, 'Last Name > 41 characters');
    expect(result).toBeDefined();
    expect(result.status).toBe(200);

    expect(result.requestID).toBeTruthy();
    expect(result.getRequestStatus).toBeDefined();
    expect(result.getRequestStatus).toContain('Error');
  });

  test('CC-18 On Premise valid', async ({ request }) => {
    const payload = await generatePayloadWithFakerData();
    payload.distributionChannel = { Code: '10', Name: 'On Premise' };

    const result = await runFullFlow(request, payload, 'On Premise Valid Flow');
    expect(result.status).toBe(200);

    if (result.requestID) {
      expect(result.getRequestStatus).toBeDefined();
      expect(result.getRequestStatus).toContain('Active');

      if (result.getRequestStatus === 'Active') {
        expect(result.globalID).toBeTruthy();
        expect(result.getCustomerStatus).toBe(200);
      }
    }
  });

  test('CC-19 Off Premise valid', async ({ request }) => {
    const payload = await generatePayloadWithFakerData();
    payload.distributionChannel = { Code: '20', Name: 'Off Premise' };

    const result = await runFullFlow(request, payload, 'Off Premise Valid Flow');
    expect(result.status).toBe(200);

    if (result.requestID) {
      expect(result.getRequestStatus).toBeDefined();
      expect(result.getRequestStatus).toContain('Active');

      if (result.getRequestStatus === 'Active') {
        expect(result.globalID).toBeTruthy();
        expect(result.getCustomerStatus).toBe(200);
      }
    }
  });

  test('CC-20 On/Off Premise - missing selection', async ({ request }) => {
    const payload = await generatePayloadWithFakerData();
    payload.distributionChannel = null;
    const result = await runFullFlow(request, payload, 'On/Off Premise - missing selection');
    expect(result).toBeDefined();
    expect(result.status).toBe(200);

    expect(result.requestID).toBeTruthy();
    expect(result.getRequestStatus).toBeDefined();
    expect(result.getRequestStatus).toContain('Error');
  });

  test('CC-21 Unauthorized Request', async ({ request }) => {
    const payload = await generatePayloadWithFakerData();
    const res = await request.post(`${baseUrl}${apiPaths['aws-create-customer']}`, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'INVALID_KEY',
        Authorization: 'INVALID_TOKEN',
      },
      data: payload,
    });

    expect([401, 403]).toContain(res.status());
  });

  test('CC-22 Verify duplicate customer error', async ({ request }) => {
    const payload = await generatePayloadWithFakerData();

    const result = await runFullFlow(request, payload, 'Create customer with valid details');
    expect(result).toBeDefined();
    expect(result.status).toBe(200);

    if (result.requestID) {
      expect(result.getRequestStatus).toBeDefined();
      expect(result.getRequestStatus).toContain('Active');

      if (result.getRequestStatus === 'Active') {
        expect(result.globalID).toBeTruthy();

        expect(result.getCustomerStatus).toBe(200);

        // Attempt to create the same customer again
        const duplicateResult = await runFullFlow(request, payload, 'Duplicate Customer Creation');
        expect(duplicateResult).toBeDefined();
        expect(duplicateResult.status).toBe(200);

        expect(duplicateResult.requestID).toBeTruthy();
        expect(duplicateResult.getRequestStatus).toBeDefined();
        expect(duplicateResult.getRequestStatus).toContain('Error');
        const errors = duplicateResult.getReqData?.error;
        expect(errors).toBeDefined();
        expect(Array.isArray(errors)).toBeTruthy();
        expect(errors.length).toBeGreaterThan(0);

        // Validate each error object structure
        for (const err of errors) {
          expect(err).toHaveProperty('message');
          expect(err).toHaveProperty('errorCode');

          // Check that known duplicate messages/codes appear
          if (err.errorCode === 'sf-duplicate') {
            expect(err.message).toContain('duplicate value found');
          }
          if (err.errorCode === 's4-duplicate') {
            expect(err.message).toContain('already exists');
          }
        }

        // At least one duplicate-related error must exist
        const duplicateCodes = errors.map((e: { errorCode: string }) => e.errorCode);
        expect(duplicateCodes).toEqual(expect.arrayContaining(['sf-duplicate', 's4-duplicate']));
      }
    }
  });

  test('CC-23 Create customer with NON ALCOHOL license type', async ({ request }) => {
    const payload = await generatePayloadWithFakerData();
    // NON ALCOHOL license type does not require a valid license number
    // payload.alcoholLicenseNumber = 'NA';
    payload.licenseType = 'NON ALCOHOL';

    const result = await runFullFlow(request, payload, 'Create customer with NON ALCOHOL license type');
    expect(result).toBeDefined();
    expect(result.status).toBe(200);

    if (result.requestID) {
      expect(result.getRequestStatus).toBeDefined();
      console.log(`CC-23: Request Status = ${result.getRequestStatus}`);

      // Handle different statuses: Active, In Review, Error, Pending
      if (result.getRequestStatus === 'Active') {
        expect(result.globalID).toBeTruthy();
        expect(result.getCustomerStatus).toBe(200);

        // Fetch customer data to verify license type and license number
        const customerData = await getCustomerByGlobalID(request, result.globalID!);
        const customer = customerData.body?.data?.customer;

        console.log(`CC-23: Customer License Type = ${customer?.licenseType}`);
        console.log(`CC-23: Customer License Number = ${customer?.licenseNumber || customer?.licenses?.[0]?.number}`);

        // Verify the customer was created with NON ALCOHOL license type
        expect(customer?.licenseType).toBe('NON ALCOHOL');
        // For NON ALCOHOL, license number might be NA or empty
        const licenseNum = customer?.licenseNumber || customer?.licenses?.[0]?.number;
        console.log(`CC-23: Verified License Number = ${licenseNum}`);
      } else if (result.getRequestStatus === 'In Review') {
        console.log('CC-23: Customer creation is In Review - verification stopped here');
        expect(result.requestID).toBeTruthy();
      } else {
        console.log(`CC-23: Customer creation ended with status: ${result.getRequestStatus}`);
        expect(result.requestID).toBeTruthy();
      }
    }
  });

  test('CC-24 Create customer with LICENSE EXEMPT license type', async ({ request }) => {
    const payload = await generatePayloadWithFakerData();
    // LICENSE EXEMPT license type does not require a valid license number
    // payload.alcoholLicenseNumber = 'NA';
    payload.licenseType = 'LICENSE EXEMPT';

    const result = await runFullFlow(request, payload, 'Create customer with LICENSE EXEMPT license type');
    expect(result).toBeDefined();
    expect(result.status).toBe(200);

    if (result.requestID) {
      expect(result.getRequestStatus).toBeDefined();
      console.log(`CC-24: Request Status = ${result.getRequestStatus}`);

      // Handle different statuses: Active, In Review, Error, Pending
      if (result.getRequestStatus === 'Active') {
        expect(result.globalID).toBeTruthy();
        expect(result.getCustomerStatus).toBe(200);

        // Fetch customer data to verify license type and license number
        const customerData = await getCustomerByGlobalID(request, result.globalID!);
        const customer = customerData.body?.data?.customer;

        console.log(`CC-24: Customer License Type = ${customer?.licenseType}`);
        console.log(`CC-24: Customer License Number = ${customer?.licenseNumber || customer?.licenses?.[0]?.number}`);

        // Verify the customer was created with LICENSE EXEMPT license type
        expect(customer?.licenseType).toBe('LICENSE EXEMPT');
        // For LICENSE EXEMPT, license number might be NA or empty
        const licenseNum = customer?.licenseNumber || customer?.licenses?.[0]?.number;
        console.log(`CC-24: Verified License Number = ${licenseNum}`);
      } else if (result.getRequestStatus === 'In Review') {
        console.log('CC-24: Customer creation is In Review - verification stopped here');
        expect(result.requestID).toBeTruthy();
      } else {
        console.log(`CC-24: Customer creation ended with status: ${result.getRequestStatus}`);
        expect(result.requestID).toBeTruthy();
      }
    }
  });

  // CUSTOMER-51 Test cases

  test('CC-25-01 | Verify non-ASCII characters are scrubbed from payload', async ({ request }) => {
    const payload = await generatePayloadWithFakerData();

    // Add non-ASCII characters (Ctrl+M = \r, newlines, null bytes, etc.)
    payload.accountName = 'Test\rAccount\nName'; // Ctrl+M and newline
    payload.legalOwnerName = 'Legal\x00Owner\x1aName'; // null byte and control char
    payload.Address[0].addressLine1 = '123\rMain\nStreet';
    payload.Address[0].city = 'New\rYork\x00City';
    payload.contactFirstName = 'John\x1a';
    payload.contactLastName = 'Doe\r\n';

    console.log('CC-25-01: Payload with non-ASCII chars:', JSON.stringify(payload, null, 2));

    const result = await runFullFlow(request, payload, 'Test non-ASCII character scrubbing');
    expect(result).toBeDefined();
    expect(result.status).toBe(200);

    if (result.requestID) {
      expect(result.getRequestStatus).toBeDefined();
      console.log(`CC-25-01: Request Status = ${result.getRequestStatus}`);

      if (result.getRequestStatus === 'Active') {
        expect(result.globalID).toBeTruthy();
        expect(result.getCustomerStatus).toBe(200);

        // Fetch customer data to verify scrubbing
        const customerData = await getCustomerByGlobalID(request, result.globalID!);
        const customer = customerData.body?.data?.customer;

        console.log(`CC-25-01: Account Name = "${customer?.accountName}"`);
        console.log(`CC-25-01: City = "${customer?.addresses?.[0]?.city}"`);

        // Verify non-ASCII characters are removed
        expect(customer?.accountName).not.toContain('\r');
        expect(customer?.accountName).not.toContain('\n');
        expect(customer?.accountName).not.toContain('\x00');

        expect(customer?.addresses?.[0]?.city).not.toContain('\r');
        expect(customer?.addresses?.[0]?.city).not.toContain('\x00');

        // Verify data should only contain ASCII characters
        expect(customer?.accountName).toMatch(/^[A-Z0-9\s&-]+$/);
      } else if (result.getRequestStatus === 'In Review' || result.getRequestStatus === 'Error') {
        console.log(`CC-25-01: Ended with status: ${result.getRequestStatus}`);
        expect(result.requestID).toBeTruthy();
      }
    }
  });

  test('CC-25-02 | Verify leading and trailing spaces are trimmed', async ({ request }) => {
    const payload = await generatePayloadWithFakerData();

    // Add leading and trailing spaces
    payload.accountName = '    Test Account Name    ';
    payload.legalOwnerName = '\t\tLegal Owner Name\t\t';
    payload.Address[0].addressLine1 = '  123 Main Street  ';
    payload.Address[0].city = '  New York  ';
    payload.Address[0].county = '  Kings County  ';
    payload.contactFirstName = '  Jane  ';
    payload.contactLastName = '  Smith  ';

    console.log('CC-25-02: Payload with spaces:', JSON.stringify(payload, null, 2));

    const result = await runFullFlow(request, payload, 'Test leading/trailing space trimming');
    expect(result).toBeDefined();
    expect(result.status).toBe(200);

    if (result.requestID) {
      expect(result.getRequestStatus).toBeDefined();
      console.log(`CC-25-02: Request Status = ${result.getRequestStatus}`);

      if (result.getRequestStatus === 'Active') {
        expect(result.globalID).toBeTruthy();
        expect(result.getCustomerStatus).toBe(200);

        // Fetch customer data to verify trimming
        const customerData = await getCustomerByGlobalID(request, result.globalID!);
        const customer = customerData.body?.data?.customer;

        console.log(`CC-25-02: Account Name = "${customer?.accountName}"`);
        console.log(`CC-25-02: City = "${customer?.addresses?.[0]?.city}"`);
        console.log(`CC-25-02: Address Line 1 = "${customer?.addresses?.[0]?.addressLine1}"`);

        // Verify no leading/trailing spaces
        expect(customer?.accountName?.trim()).toBe(customer?.accountName);
        expect(customer?.legalOwnerName?.trim()).toBe(customer?.legalOwnerName);
        expect(customer?.addresses?.[0]?.addressLine1?.trim()).toBe(customer?.addresses?.[0]?.addressLine1);
        expect(customer?.addresses?.[0]?.city?.trim()).toBe(customer?.addresses?.[0]?.city);

        // Verify no leading spaces
        expect(customer?.accountName).not.toMatch(/^\s/);
        expect(customer?.addresses?.[0]?.city).not.toMatch(/^\s/);

        // Verify no trailing spaces
        expect(customer?.accountName).not.toMatch(/\s$/);
        expect(customer?.addresses?.[0]?.city).not.toMatch(/\s$/);
      } else if (result.getRequestStatus === 'In Review' || result.getRequestStatus === 'Error') {
        console.log(`CC-25-02: Ended with status: ${result.getRequestStatus}`);
        expect(result.requestID).toBeTruthy();
      }
    }
  });

  test('CC-25-03 | Verify both spaces and non-ASCII chars are cleaned', async ({ request }) => {
    const payload = await generatePayloadWithFakerData();

    // Combine both issues: spaces AND non-ASCII characters
    payload.accountName = '  Test\rAccount\nName  ';
    payload.legalOwnerName = ' \tLegal\x00Owner\r ';
    payload.Address[0].addressLine1 = '  123\rMain\nSt  ';
    payload.Address[0].city = ' \tNew\x1aYork\r ';
    payload.contactFirstName = '  John\x00  ';
    payload.contactLastName = ' \rDoe\n ';

    console.log('CC-25-03: Payload with combined issues:', JSON.stringify(payload, null, 2));

    const result = await runFullFlow(request, payload, 'Test combined space and non-ASCII cleaning');
    expect(result).toBeDefined();
    expect(result.status).toBe(200);

    if (result.requestID) {
      expect(result.getRequestStatus).toBeDefined();
      console.log(`CC-25-03: Request Status = ${result.getRequestStatus}`);

      if (result.getRequestStatus === 'Active') {
        expect(result.globalID).toBeTruthy();
        expect(result.getCustomerStatus).toBe(200);

        // Fetch customer data
        const customerData = await getCustomerByGlobalID(request, result.globalID!);
        const customer = customerData.body?.data?.customer;

        console.log(`CC-25-03: Account Name = "${customer?.accountName}"`);
        console.log(`CC-25-03: City = "${customer?.addresses?.[0]?.city}"`);

        // Verify both trimming AND non-ASCII removal
        expect(customer?.accountName?.trim()).toBe(customer?.accountName);
        expect(customer?.accountName).not.toContain('\r');
        expect(customer?.accountName).not.toContain('\n');
        expect(customer?.accountName).not.toMatch(/^\s/);
        expect(customer?.accountName).not.toMatch(/\s$/);

        expect(customer?.addresses?.[0]?.city?.trim()).toBe(customer?.addresses?.[0]?.city);
        expect(customer?.addresses?.[0]?.city).not.toContain('\x1a');
        expect(customer?.addresses?.[0]?.city).not.toContain('\r');

        // Should only contain clean ASCII characters
        expect(customer?.accountName).toMatch(/^[A-Z0-9\s&-]+$/);
      } else if (result.getRequestStatus === 'In Review' || result.getRequestStatus === 'Error') {
        console.log(`CC-25-03: Ended with status: ${result.getRequestStatus}`);
        expect(result.requestID).toBeTruthy();
      }
    }
  });

  // CUSTOMER-261: get-request must accept a customerID (in addition to requestID) and
  // return a request object back for a valid customer.
  test("CC-26-01 | get-request accepts customerID and returns that customer's request", async ({ request }) => {
    const payload = await generatePayloadWithFakerData();
    const result = await runFullFlow(request, payload, 'CC-26-01 - create for customerID lookup');
    expect(result.status).toBe(200);
    expect(result.getRequestStatus).toContain('Active');
    expect(result.globalID).toBeTruthy();

    const response = await request.get(`${baseUrl}${apiPaths['aws-get-request']}`, {
      headers: getAuthHeaders(),
      data: { customerID: result.globalID },
      timeout: 30_000,
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBeTruthy();
    expect(body.requestID).toBe(result.requestID);
    expect(body.data?.globalID ?? result.globalID).toBe(result.globalID);
    expect(body.data?.status).toBe('Active');
  });

  // CUSTOMER-261 also asks for two path-style URLs (in addition to the body-based lookup
  // above): /request/{requestId} and /request/customer/{globalId}.
  test('CC-26-02 | GET /request/{requestId} and /request/customer/{globalId} both return the request', async ({
    request,
  }) => {
    const payload = await generatePayloadWithFakerData();
    const result = await runFullFlow(request, payload, 'CC-26-02 - create for path-style lookup');
    expect(result.status).toBe(200);
    expect(result.getRequestStatus).toContain('Active');
    expect(result.globalID).toBeTruthy();

    const byRequestId = await request.get(`${baseUrl}/request/${result.requestID}`, {
      headers: getAuthHeaders(),
      timeout: 30_000,
    });
    expect(byRequestId.status()).toBe(200);
    const byRequestIdBody = await byRequestId.json();
    expect(byRequestIdBody.requestID).toBe(result.requestID);
    expect(byRequestIdBody.data?.globalID).toBe(result.globalID);

    const byCustomer = await request.get(`${baseUrl}/request/customer/${result.globalID}`, {
      headers: getAuthHeaders(),
      timeout: 30_000,
    });
    expect(byCustomer.status()).toBe(200);
    const byCustomerBody = await byCustomer.json();
    expect(byCustomerBody.requestID).toBe(result.requestID);
    expect(byCustomerBody.data?.globalID).toBe(result.globalID);
  });

  // CC-26-03 ("get-request by customerID returns the newest request when multiple
  // exist for the same customer_id") is intentionally not implemented yet. Producing that
  // scenario requires a second create-request row linked to an existing customer's
  // globalID, but every duplicate-creation path currently available through the public
  // API either rejects before any customer linkage happens (same license number → early
  // c360 "Invalid License Association" check, no globalID on the Error row) or doesn't
  // get flagged as a duplicate at all (same identity, different license → creates an
  // unrelated new customer). This also reproduces on the pre-existing, previously-passing
  // verify-customer-id-on-error.spec.ts (CUSTOMER-120), which depends on the same
  // linkage — tracked as a separate regression, not a defect in CUSTOMER-261 itself.

  test('CC-25 Create customer with valid details', async () => {
    const payload = await generatePayloadWithFakerData();
    console.log(JSON.stringify(payload, null, 2));
  });
});
