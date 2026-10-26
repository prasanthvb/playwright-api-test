import { test, expect } from '@playwright/test';
import { generateBrowseCustomerPayload } from '../../custom_modules/api/payload/generate-browse-customer-payloads';
import { browseCustomers } from '../../custom_modules/api/aws-utils/aws-api-helper';
import { awsConfig, getAuthHeaders } from '../../../config/api-config';
import data from '../../data/api-data/test-data.json';
import apiPaths from '../../data/api-data/api-path.json';
const baseUrl = awsConfig.baseUrl;

test.describe('AWS Browse Customers API - Validation Flow', () => {
  test('BC-01 Browse with valid state only', async ({ request }) => {
    const payload = generateBrowseCustomerPayload('validStateOnly');
    const { response, body } = await browseCustomers(request, payload);
    expect(response.status()).toBe(200);
    expect(Array.isArray(body.records)).toBeTruthy();
    if (body.records?.length > 0) expect(body.records[0].Address[0].state).toBe(data.validState1);
  });

  test('BC-02 Browse with valid state + accountName filter', async ({ request }) => {
    const payload = generateBrowseCustomerPayload('validStateWithAccountName');
    const { response, body } = await browseCustomers(request, payload);
    expect(response.status()).toBe(200);
    expect(body.records?.length || 0).toBe(0);
  });

  test('BC-03 Browse with valid state + alcoholLicenseNumber filter', async ({ request }) => {
    const payload = generateBrowseCustomerPayload('validStateWithLicense');
    const { response, body } = await browseCustomers(request, payload);
    expect(response.status()).toBe(200);
    if (body.records?.length > 0) expect(body.records[0].alcoholLicenseNumber).toBe('BQ1116872');
  });

  test('BC-04 Browse with valid state + non-matching filter', async ({ request }) => {
    const payload = generateBrowseCustomerPayload('validStateWithNonMatchingFilter');
    const { response, body } = await browseCustomers(request, payload);
    expect(response.status()).toBe(200);
    expect(body.records?.length || 0).toBe(0);
  });

  test('BC-05 Browse with valid state + unsupported filter', async ({ request }) => {
    const payload = generateBrowseCustomerPayload('validStateWithUnsupportedFilter');
    const { response, body } = await browseCustomers(request, payload);
    expect(response.status()).toBe(200);
    expect(body.records?.length || 0).toBe(0);
  });

  test('BC-06 Browse with invalid state', async ({ request }) => {
    const payload = generateBrowseCustomerPayload('invalidState');
    const { response, body } = await browseCustomers(request, payload);
    expect(response.status()).toBe(200);
    expect(body.records?.length || 0).toBe(0);
  });

  test('BC-07 Browse with missing state field', async ({ request }) => {
    const payload = generateBrowseCustomerPayload('missingState');
    const { response, body } = await browseCustomers(request, payload);
    expect(response.status()).toBe(200);
    expect(body.records?.length || 0).toBe(0);
  });

  test('BC-08 Unauthorized request', async ({ request }) => {
    const payload = generateBrowseCustomerPayload('unauthorized');
    const res = await request.get(`${baseUrl}${apiPaths['aws-browse-customer']}`, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'INVALID_KEY',
        Authorization: 'INVALID_TOKEN',
      },
      data: payload,
    });

    expect([401, 403]).toContain(res.status());
  });
});

// CUSTOMER-318 | each formattedError entry returned by browseCustomers carries an actionCode and
// an action description (sourced from a DB table). The ticket text names the description
// property both "actionDescription" (description) and "actionCodeDescription" (title / AC);
// the API returns "actionDescription", which is what is asserted here.
const CUSTOMER_318_STATES = ['AR', 'TN', 'KY'];
const FAILED_STATUSES = ['Error', 'In Review'];

interface Evidence {
  state: string;
  requestBody: Record<string, unknown>;
  httpStatus: number;
  recordCount: number;
  failedRecords: number;
  formattedErrorEntries: number;
  actionCodes: Record<string, number>;
  descriptions: Record<string, number>;
  sampleEntry: unknown;
  sampleRequestID?: string;
  getRequest?: { requestID: string; httpStatus: number; formattedError: unknown };
}
const evidence: Evidence[] = [];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Rec = Record<string, any>;

function browseBody(state: string) {
  return {
    sortToken: 'time',
    sortDirection: 'desc',
    pageSize: 200,
    state,
    filterValue: '',
    database_mode: 'import_c360',
  };
}

test.describe('CUSTOMER-318 | actionCode & actionDescription on formattedError (browseCustomers)', () => {
  test.beforeEach(() => {
    evidence.length = 0;
  });

  // eslint-disable-next-line no-empty-pattern
  test.afterEach(async ({}, testInfo) => {
    await testInfo.attach('evidence', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' });
  });

  CUSTOMER_318_STATES.forEach((state, i) => {
    test(`AC-0${i + 1} | ${state} | every formattedError entry has actionCode and actionDescription`, async ({
      request,
    }) => {
      const requestBody = browseBody(state);
      const { response, body } = await browseCustomers(request, requestBody);
      expect(response.status()).toBe(200);

      const records: Rec[] = body.records ?? [];
      expect(records.length).toBeGreaterThan(0);

      const failed = records.filter((r) => FAILED_STATUSES.includes(r.status));
      expect(failed.length, `Expected Error / In Review records in ${state}`).toBeGreaterThan(0);

      const ev: Evidence = {
        state,
        requestBody,
        httpStatus: response.status(),
        recordCount: records.length,
        failedRecords: failed.length,
        formattedErrorEntries: 0,
        actionCodes: {},
        descriptions: {},
        sampleEntry: undefined,
      };
      evidence.push(ev);

      for (const rec of failed) {
        // every failed record carries a non-empty formattedError array
        expect(Array.isArray(rec.formattedError), `${rec.requestID}: formattedError is an array`).toBeTruthy();
        expect(rec.formattedError.length, `${rec.requestID}: formattedError not empty`).toBeGreaterThan(0);

        for (const entry of rec.formattedError) {
          ev.formattedErrorEntries++;
          ev.sampleEntry ??= entry;
          ev.sampleRequestID ??= rec.requestID;
          ev.actionCodes[String(entry.actionCode)] = (ev.actionCodes[String(entry.actionCode)] ?? 0) + 1;
          ev.descriptions[String(entry.actionDescription)] =
            (ev.descriptions[String(entry.actionDescription)] ?? 0) + 1;

          // existing contract is unchanged
          expect(entry).toHaveProperty('source');
          expect(entry).toHaveProperty('code');
          expect(entry).toHaveProperty('message');

          // new properties (CUSTOMER-318)
          expect(typeof entry.actionCode, `${rec.requestID}: actionCode type`).toBe('string');
          expect(entry.actionCode.length, `${rec.requestID}: actionCode not empty`).toBeGreaterThan(0);
          expect(typeof entry.actionDescription, `${rec.requestID}: actionDescription type`).toBe('string');
          expect(entry.actionDescription.length, `${rec.requestID}: actionDescription not empty`).toBeGreaterThan(0);
        }
      }
    });
  });

  test('AC-04 | The same actionCode / actionDescription are returned by browse and get-request for a request', async ({
    request,
  }) => {
    for (const state of CUSTOMER_318_STATES) {
      const requestBody = browseBody(state);
      const { response, body } = await browseCustomers(request, requestBody);
      expect(response.status()).toBe(200);
      const target = (body.records ?? []).find(
        (r: Rec) => r.status === 'Error' && r.requestID && Array.isArray(r.formattedError) && r.formattedError.length,
      );
      expect(target, `Expected an Error record with formattedError in ${state}`).toBeDefined();

      const getRequest = await request.get(`${baseUrl}${apiPaths['aws-get-request']}`, {
        headers: getAuthHeaders(),
        data: { requestID: target.requestID },
      });
      expect(getRequest.status()).toBe(200);
      const requestBodyResponse = await getRequest.json();

      evidence.push({
        state,
        requestBody,
        httpStatus: response.status(),
        recordCount: (body.records ?? []).length,
        failedRecords: 0,
        formattedErrorEntries: target.formattedError.length,
        actionCodes: {},
        descriptions: {},
        sampleEntry: target.formattedError[0],
        sampleRequestID: target.requestID,
        getRequest: {
          requestID: target.requestID,
          httpStatus: getRequest.status(),
          formattedError: requestBodyResponse.formattedError,
        },
      });

      // get-request returns the same (deduplicated) formattedError entries as browse, action fields included
      expect(Array.isArray(requestBodyResponse.formattedError)).toBeTruthy();
      expect(requestBodyResponse.formattedError).toEqual(target.formattedError);
      for (const entry of requestBodyResponse.formattedError) {
        expect(typeof entry.actionCode).toBe('string');
        expect(entry.actionCode.length).toBeGreaterThan(0);
        expect(typeof entry.actionDescription).toBe('string');
        expect(entry.actionDescription.length).toBeGreaterThan(0);
      }
    }
  });
});
