import { APIRequestContext, test, expect } from '@playwright/test';
import apiPaths from '../../data/api-data/api-path.json';
import { generatePayloadWithFakerData } from '../../custom_modules/api/payload/generate-new-customer-payload';
import { createCustomer, pollGetRequest, browseCustomers } from '../../custom_modules/api/aws-utils/aws-api-helper';
import testData from '../../data/api-data/test-data.json';
import { awsConfig, getAdminAuthHeaders } from '../../../config/api-config';

const baseUrl = awsConfig.baseUrl;

const REQUEST_RECORD_FIELDS = [
  'requestId',
  'customerId',
  'customerName',
  'agentId',
  'requestBody',
  'licenseNumber',
  'source',
  'error',
  'state',
  'status',
  'timestamp',
  'timestampComplete',
  'stepResults',
  'apiResults',
];

// A request record is written to the request table asynchronously, so it can lag
// briefly behind create-customer/get-request. Poll admin/request until it shows up
// instead of assuming it's immediately queryable.
async function pollAdminRequest(request: APIRequestContext, requestId: string, maxRetries = 10, intervalSec = 5) {
  let response;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    response = await request.get(`${baseUrl}${apiPaths['admin-request']}/${requestId}`, {
      headers: getAdminAuthHeaders(),
    });
    if (response.status() === 200) break;
    await new Promise((r) => setTimeout(r, intervalSec * 1000));
  }
  return response!;
}

test.describe('CUSTOMER-135 | Verify Admin Request API (GET/DELETE by requestId)', () => {
  // Both fixtures below are sourced from real, already-settled data via browse-customers
  // rather than freshly created records — this environment's create → Active transition
  // has been unreliable, and browsing avoids that dependency entirely for the GET tests.
  // Sourced generically by state rather than a specific account filter (e.g. PLCB), since
  // which accounts have errors varies by environment.
  let activeRequestId: string;
  let existingErrorRequestId: string;
  let existingErrorGlobalID: string | null;

  test.beforeAll(async ({ request }) => {
    test.setTimeout(120_000);

    const { body: stateBody } = await browseCustomers(request, {
      sortToken: 'name',
      sortDirection: 'desc',
      pageSize: 100,
      state: testData.validState1,
    });
    const records = stateBody.records ?? [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const activeRecord = records.find((r: any) => r.status === 'Active' && r.requestID);
    expect(
      activeRecord,
      `Expected at least one Active record with a requestID in ${testData.validState1}`,
    ).toBeDefined();
    activeRequestId = activeRecord.requestID;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const errorRecord = records.find((r: any) => r.status === 'Error' && r.requestID);
    expect(
      errorRecord,
      `Expected at least one Error-state record with a requestID in ${testData.validState1}`,
    ).toBeDefined();
    existingErrorRequestId = errorRecord.requestID;
    existingErrorGlobalID = errorRecord.globalID ?? null;
  });

  test('AR-01 | GET /admin/request/{requestId} returns an Active request record', async ({ request }) => {
    const response = await pollAdminRequest(request, activeRequestId);
    expect(response.status()).toBe(200);

    const body = await response.json();
    const record = body.request;
    for (const field of REQUEST_RECORD_FIELDS) {
      expect(record).toHaveProperty(field);
    }

    expect(record.requestId).toBe(activeRequestId);
    expect(record.status).toContain('Active');
  });

  test('AR-02 | GET /admin/request/{requestId} returns an Error request record', async ({ request }) => {
    const response = await request.get(`${baseUrl}${apiPaths['admin-request']}/${existingErrorRequestId}`, {
      headers: getAdminAuthHeaders(),
    });

    expect(response.status()).toBe(200);

    const body = await response.json();
    const record = body.request;
    for (const field of REQUEST_RECORD_FIELDS) {
      expect(record).toHaveProperty(field);
    }

    expect(record.requestId).toBe(existingErrorRequestId);
    expect(record.status).toContain('Error');
    expect(record.customerId).toBe(existingErrorGlobalID);
    expect(record.error).toBeTruthy();
  });

  test('AR-03 | GET /admin/request/{requestId} returns 404 for a nonexistent requestId', async ({ request }) => {
    const response = await request.get(`${baseUrl}${apiPaths['admin-request']}/does-not-exist-${Date.now()}`, {
      headers: getAdminAuthHeaders(),
    });

    expect(response.status()).toBe(404);
  });

  test('AR-04 | DELETE /admin/request/{requestId} deletes a request and it is no longer retrievable', async ({
    request,
  }) => {
    test.setTimeout(180_000);
    const payload = await generatePayloadWithFakerData();

    // A fresh request created just for this test, so deleting it is safe (unlike the
    // shared PLCB fixture data used for AR-02).
    const { status: createStatus, requestID } = await createCustomer(request, payload);
    expect(createStatus).toBe(200);
    expect(requestID).toBeTruthy();
    await pollGetRequest(request, requestID as string);

    const getBeforeDelete = await pollAdminRequest(request, requestID as string);
    expect(getBeforeDelete.status()).toBe(200);

    const deleteResponse = await request.delete(`${baseUrl}${apiPaths['admin-request']}/${requestID}`, {
      headers: getAdminAuthHeaders(),
    });

    expect(deleteResponse.status()).toBe(200);

    const deletedBody = await deleteResponse.json();
    const deletedRecord = deletedBody.request;
    for (const field of REQUEST_RECORD_FIELDS) {
      expect(deletedRecord).toHaveProperty(field);
    }
    expect(deletedRecord.requestId).toBe(requestID);

    // Row must actually be gone, not just soft-flagged
    const getAfterDelete = await request.get(`${baseUrl}${apiPaths['admin-request']}/${requestID}`, {
      headers: getAdminAuthHeaders(),
    });
    expect(getAfterDelete.status()).toBe(404);
  });

  test('AR-05 | DELETE /admin/request/{requestId} returns 404 for a nonexistent requestId', async ({ request }) => {
    const response = await request.delete(`${baseUrl}${apiPaths['admin-request']}/does-not-exist-${Date.now()}`, {
      headers: getAdminAuthHeaders(),
    });

    expect(response.status()).toBe(404);
  });
});
