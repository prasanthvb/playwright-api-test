import { APIRequestContext, APIResponse, test, expect } from '@playwright/test';
import apiPaths from '../../data/api-data/api-path.json';
import { browseCustomers } from '../../custom_modules/api/aws-utils/aws-api-helper';
import { awsConfig, getAdminAuthHeaders, getAuthHeaders } from '../../../config/api-config';

const baseUrl = awsConfig.baseUrl;

// States are tried in order until one has a suitable record - which states hold In Review /
// Error / Active requests varies by environment.
const STATES = ['KY', 'AR', 'TN'];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BrowseRecord = Record<string, any>;

// Every API call made by a test is recorded and attached to the test result as
// "api-flow" so the test report can show method / request / response per step.
interface FlowStep {
  step: string;
  method: string;
  path: string;
  requestBody?: unknown;
  status: number;
  response: unknown;
}
const flow: FlowStep[] = [];
const MAX_RESPONSE_CHARS = 1500;

async function record(step: string, method: string, path: string, response: APIResponse, requestBody?: unknown) {
  const text = await response.text();
  let parsed: unknown = text;
  try {
    parsed = JSON.parse(text);
  } catch {
    // non-JSON body - keep as text
  }
  const trimmed = text.length > MAX_RESPONSE_CHARS ? `${text.slice(0, MAX_RESPONSE_CHARS)}... [truncated]` : parsed;
  flow.push({ step, method, path, requestBody, status: response.status(), response: trimmed });
}

async function browseState(request: APIRequestContext, state: string): Promise<BrowseRecord[]> {
  const payload = {
    sortToken: 'time',
    sortDirection: 'desc',
    pageSize: 200,
    state,
    filterValue: '',
    database_mode: 'import_c360',
  };
  const { response, body } = await browseCustomers(request, payload);
  const records: BrowseRecord[] = body.records ?? [];
  const counts: Record<string, number> = {};
  records.forEach((r) => (counts[r.status] = (counts[r.status] ?? 0) + 1));
  flow.push({
    step: `Browse customers (${state})`,
    method: 'GET',
    path: apiPaths['aws-browse-customer'],
    requestBody: payload,
    status: response.status(),
    response: { recordCount: records.length, statusCounts: counts },
  });
  return records;
}

async function getAdminRequest(request: APIRequestContext, requestId: string, label = 'admin/request') {
  const path = `${apiPaths['admin-request']}/${requestId}`;
  const response = await request.get(`${baseUrl}${path}`, { headers: getAdminAuthHeaders() });
  await record(`Get request record (${label})`, 'GET', path, response);
  expect(response.status()).toBe(200);
  return (await response.json()).request;
}

async function retryRequest(request: APIRequestContext, requestId: string, data: object = {}) {
  const path = apiPaths['admin-request-retry'].replace('{requestId}', requestId);
  const response = await request.post(`${baseUrl}${path}`, {
    headers: getAdminAuthHeaders(),
    data,
    timeout: 60_000,
  });
  await record('Retry request', 'POST', path, response, data);
  return response;
}

// GET /request/customer/{globalID} -> the request currently associated with that customer
async function getRequestIdByCustomer(request: APIRequestContext, globalID: string) {
  const path = `${apiPaths['request-by-customer']}/${globalID}`;
  const response = await request.get(`${baseUrl}${path}`, { headers: getAuthHeaders() });
  await record('Get request id by customer id', 'GET', path, response);
  expect(response.status()).toBe(200);
  return (await response.json()).requestID as string;
}

test.describe('CUSTOMER-225 | Request Retry', () => {
  test.beforeEach(() => {
    flow.length = 0;
  });

  // eslint-disable-next-line no-empty-pattern
  test.afterEach(async ({}, testInfo) => {
    await testInfo.attach('api-flow', {
      body: JSON.stringify({ environment: awsConfig.environment, steps: flow }, null, 2),
      contentType: 'application/json',
    });
  });

  test('RT-01 | Retry an In Review / Error request restarts the workflow and keeps step results', async ({
    request,
  }) => {
    test.setTimeout(240_000);

    // Prefer In Review, fall back to Error. Retrying re-runs the Step Function for a
    // shared Dev record, which is acceptable here.
    let target: BrowseRecord | undefined;
    for (const state of STATES) {
      const records = await browseState(request, state);
      target =
        records.find((r) => r.status === 'In Review' && r.requestID) ??
        records.find((r) => r.status === 'Error' && r.requestID);
      if (target) break;
    }
    expect(target, `Expected an In Review or Error record with a requestID in ${STATES.join('/')}`).toBeDefined();
    const requestId: string = target!.requestID;

    const before = await getAdminRequest(request, requestId, 'before retry');
    expect(['Error', 'In Review'].some((s) => before.status.includes(s))).toBeTruthy();
    expect(before.stepResults).toBeTruthy();

    const retryResponse = await retryRequest(request, requestId);
    expect(retryResponse.status(), await retryResponse.text()).toBe(200);

    const retryBody = await retryResponse.json();
    expect(retryBody.requestID).toBe(requestId);
    expect(retryBody.message).toBe('Retry started');
    expect(retryBody.executionArn).toContain(':execution:');
    expect(retryBody.executionArn).toContain(':retry-');

    // The workflow ran again: the record settles and timestampComplete moves forward.
    await expect
      .poll(
        async () => {
          const r = await getAdminRequest(request, requestId, 'poll after retry');
          return r.status !== 'Pending' && r.timestampComplete !== before.timestampComplete;
        },
        { message: 'retry should re-run and settle', timeout: 150_000, intervals: [5_000] },
      )
      .toBe(true);

    const after = await getAdminRequest(request, requestId, 'after retry');
    expect(after.requestId).toBe(requestId);
    expect(new Date(after.timestampComplete).getTime()).toBeGreaterThan(new Date(before.timestampComplete).getTime());
    expect(after.requestBody.accountName).toBe(before.requestBody.accountName);
    expect(Object.keys(after.stepResults)).toEqual(expect.arrayContaining(Object.keys(before.stepResults)));
    expect(after.apiResults).toBeTruthy();
  });

  test('RT-02 | Retry on an Active customer request is rejected - "retry not needed"', async ({ request }) => {
    test.setTimeout(240_000);

    // Active customer (has a globalID) -> request id via /request/customer/{globalID}.
    // That endpoint can hand back a later Error attempt for the customer, so keep looking
    // until the request it returns is itself Active.
    let activeRequestId: string | undefined;
    let activeGlobalID: string | undefined;
    search: for (const state of STATES) {
      const candidates = (await browseState(request, state)).filter((r) => r.status === 'Active' && r.globalID);
      for (const candidate of candidates.slice(0, 15)) {
        const requestId = await getRequestIdByCustomer(request, candidate.globalID);
        const rec = await getAdminRequest(request, requestId, 'status of request returned for customer');
        if (rec.status.includes('Active')) {
          activeRequestId = requestId;
          activeGlobalID = candidate.globalID;
          break search;
        }
      }
    }
    expect(activeRequestId, `Expected an Active customer whose request is Active in ${STATES.join('/')}`).toBeDefined();

    const before = await getAdminRequest(request, activeRequestId!, 'before retry');
    expect(before.customerId).toBe(activeGlobalID);

    const retryResponse = await retryRequest(request, activeRequestId!);
    expect(retryResponse.status()).toBe(400);
    const body = await retryResponse.json();
    expect(body.message).toBe('Request already completed successfully, retry not needed');

    // Nothing was re-run
    const after = await getAdminRequest(request, activeRequestId!, 'after retry');
    expect(after.status).toContain('Active');
    expect(after.timestampComplete).toBe(before.timestampComplete);
  });
});

// ---------------------------------------------------------------------------------------
// CUSTOMER-224 | Admin Console retrieves a request by customer id (Refresh page)
// The Refresh page must look the customer up via the request table
// (GET /request/customer/{customerId}) and not depend on the customer table, so failed
// requests that never produced a customer record can still be refreshed / retried.
// ---------------------------------------------------------------------------------------

const MAX_CANDIDATES = 100;

async function requestByCustomerRaw(request: APIRequestContext, globalID: string, step: string) {
  const path = `${apiPaths['request-by-customer']}/${globalID}`;
  const response = await request.get(`${baseUrl}${path}`, { headers: getAuthHeaders() });
  await record(step, 'GET', path, response);
  return response;
}

// Customer-table lookup (what the old Refresh page depended on)
async function getCustomerTableLookup(request: APIRequestContext, globalID: string) {
  const path = apiPaths['aws-get-customer'];
  const body = { globalID };
  const response = await request.get(`${baseUrl}${path}`, { headers: getAuthHeaders(), data: body, timeout: 30_000 });
  await record('Customer table lookup (get-customer)', 'GET', path, response, body);
  return response;
}

// Finds a customer id whose request exists but whose customer-table record does not
// (get-customer 404). That is exactly the "failed request, no customer record" scenario.
// retryableOnly also requires the request record itself to be Error / In Review - browse can
// list a request as Error while the request table still says Pending, which retry cannot act on.
async function findCustomerWithRequestOnly(request: APIRequestContext, retryableOnly = false) {
  let checked = 0;
  for (const state of STATES) {
    const candidates = (await browseState(request, state)).filter((r) => r.status !== 'Active' && r.globalID);
    for (const candidate of candidates) {
      if (checked++ >= MAX_CANDIDATES) return undefined;
      const requestLookup = await requestByCustomerRaw(request, candidate.globalID, 'Request lookup by customer id');
      const customerLookup = await getCustomerTableLookup(request, candidate.globalID);
      if (requestLookup.status() === 200 && customerLookup.status() === 404) {
        if (retryableOnly) {
          const requestId = (await requestLookup.json()).requestID as string;
          const rec = await getAdminRequest(request, requestId, 'status check');
          if (!['Error', 'In Review'].some((st) => rec.status.includes(st))) continue;
        }
        return { globalID: candidate.globalID as string, requestId: (await requestLookup.json()).requestID as string };
      }
    }
  }
  return undefined;
}

test.describe('CUSTOMER-224 | Retrieve a request by customer id (Refresh page)', () => {
  test.beforeEach(() => {
    flow.length = 0;
  });

  // eslint-disable-next-line no-empty-pattern
  test.afterEach(async ({}, testInfo) => {
    await testInfo.attach('api-flow', {
      body: JSON.stringify({ environment: awsConfig.environment, steps: flow }, null, 2),
      contentType: 'application/json',
    });
  });

  test('RC-01 | Request is found by customer id even though the customer table has no record', async ({ request }) => {
    test.setTimeout(360_000);
    const found = await findCustomerWithRequestOnly(request);
    expect(
      found,
      `Expected a non-Active request whose customer has no customer-table record in ${STATES.join('/')}`,
    ).toBeDefined();

    const response = await requestByCustomerRaw(request, found!.globalID, 'Request lookup by customer id (confirm)');
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.requestID).toBe(found!.requestId);
    expect(body.data?.status).not.toContain('Active');

    const returned = await getAdminRequest(request, found!.requestId, 'request returned for customer');
    expect(returned.customerId).toBe(found!.globalID);
    expect(returned.status).not.toContain('Active');

    // the customer-table lookup the old page relied on really fails for this customer
    const customerLookup = await getCustomerTableLookup(request, found!.globalID);
    expect(customerLookup.status()).toBe(404);
  });

  test('RC-02 | The request returned for a customer belongs to that customer and is the most recent one', async ({
    request,
  }) => {
    test.setTimeout(240_000);
    const records = (await browseState(request, STATES[0])).filter((r) => r.globalID && r.requestID).slice(0, 15);
    expect(records.length, `Expected customers with a requestID in ${STATES[0]}`).toBeGreaterThan(0);

    for (const customer of records) {
      const response = await requestByCustomerRaw(request, customer.globalID, 'Request lookup by customer id');
      expect(response.status()).toBe(200);
      const returnedId: string = (await response.json()).requestID;
      expect(returnedId).toBeTruthy();

      const returned = await getAdminRequest(request, returnedId, 'request returned for customer');
      expect(returned.customerId).toBe(customer.globalID);

      // browse lists one request for the customer; the endpoint must never return an older one
      if (returnedId !== customer.requestID) {
        const listed = await getAdminRequest(request, customer.requestID, 'request listed by browse');
        expect(new Date(returned.timestamp).getTime()).toBeGreaterThanOrEqual(new Date(listed.timestamp).getTime());
      }
    }
  });

  test('RC-03 | An Active customer resolves to a request that completed successfully', async ({ request }) => {
    test.setTimeout(240_000);
    let verified = false;
    for (const state of STATES) {
      const active = (await browseState(request, state)).filter((r) => r.status === 'Active' && r.globalID);
      for (const customer of active.slice(0, 15)) {
        const returnedId = await getRequestIdByCustomer(request, customer.globalID);
        const returned = await getAdminRequest(request, returnedId, 'request returned for customer');
        if (!returned.status.includes('Active')) continue;
        expect(returned.customerId).toBe(customer.globalID);
        expect(returned.timestampComplete).toBeTruthy();
        verified = true;
        break;
      }
      if (verified) break;
    }
    expect(verified, `Expected an Active customer whose latest request is Active in ${STATES.join('/')}`).toBeTruthy();
  });

  test('RC-04 | An unknown customer id does not return a request', async ({ request }) => {
    const response = await requestByCustomerRaw(request, `0${Date.now()}`, 'Request lookup by unknown customer id');
    const text = await response.text();
    // Currently 200 with a null body; a 404 would be equally acceptable
    expect([200, 404]).toContain(response.status());
    if (response.status() === 200) expect(text.trim() === 'null' || !JSON.parse(text)?.requestID).toBeTruthy();
  });

  test('RC-05 | The lookup is rejected without credentials', async ({ request }) => {
    const path = `${apiPaths['request-by-customer']}/2000000000`;
    const response = await request.get(`${baseUrl}${path}`);
    await record('Request lookup without auth headers', 'GET', path, response);
    expect(response.status()).toBe(403);
  });

  test('RC-06 | The request found by customer id can be retried (no customer record needed)', async ({ request }) => {
    test.setTimeout(420_000);
    const found = await findCustomerWithRequestOnly(request, true);
    test.skip(
      !found,
      `No Error / In Review request without a customer-table record in ${STATES.join('/')} for ${awsConfig.environment}`,
    );

    const before = await getAdminRequest(request, found!.requestId, 'before retry');
    const retryResponse = await retryRequest(request, found!.requestId);
    expect(retryResponse.status(), await retryResponse.text()).toBe(200);
    const retryBody = await retryResponse.json();
    expect(retryBody.requestID).toBe(found!.requestId);
    expect(retryBody.message).toBe('Retry started');

    await expect
      .poll(
        async () => {
          try {
            const r = await getAdminRequest(request, found!.requestId, 'poll after retry');
            // The retry re-ran the workflow once timestampComplete moves. Some requests are left
            // in Pending by the workflow, so the final status is not asserted here.
            return r.timestampComplete !== before.timestampComplete;
          } catch {
            return false; // transient network error while polling - try again
          }
        },
        { message: 'retry should re-run the workflow', timeout: 300_000, intervals: [5_000] },
      )
      .toBe(true);
  });
});
