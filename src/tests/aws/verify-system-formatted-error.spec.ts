import { test, expect } from '@playwright/test';
import { browseCustomers, pollGetRequest } from '../../custom_modules/api/aws-utils/aws-api-helper';

interface SystemErrorFixture {
  requestID: string;
}

// CUSTOMER-132 asks that infra-level errors get a distinct source:"system" formattedError
// entry instead of being reported as C360/S4/Salesforce errors. In this environment the
// only two source:"system" variants that actually occur are:
//   - code "unknown"       for a request whose raw error array came back empty
//   - code "gateway-error" for a request whose raw error is an unparsed HTML 502 page
// Real, already-settled examples of both are found by browsing rather than manufacturing
// a live timeout/outage.
test.describe('CUSTOMER-132 | Verify system-source formattedError mapping for infra-level errors', () => {
  let unknownFixture: SystemErrorFixture | undefined;
  let gatewayFixture: SystemErrorFixture | undefined;

  test.beforeAll(async ({ request }) => {
    test.setTimeout(180_000);

    let nextToken: string | undefined;
    let page = 0;
    const MAX_PAGES = 15;

    do {
      page++;
      const { body } = await browseCustomers(request, {
        sortToken: 'name',
        sortDirection: 'desc',
        pageSize: 100,
        state: '',
        filterValue: '',
        ...(nextToken ? { nextToken } : {}),
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const record of (body.records ?? []) as any[]) {
        for (const formatted of record.formattedError ?? []) {
          if (formatted.source !== 'system') continue;
          if (formatted.code === 'unknown' && !unknownFixture) {
            unknownFixture = { requestID: record.requestID };
          }
          if (formatted.code === 'gateway-error' && !gatewayFixture) {
            gatewayFixture = { requestID: record.requestID };
          }
        }
      }

      nextToken = body.nextToken;
    } while (nextToken && page < MAX_PAGES && (!unknownFixture || !gatewayFixture));

    expect(unknownFixture, 'Expected to find a source:"system" code:"unknown" record while browsing').toBeDefined();
    expect(
      gatewayFixture,
      'Expected to find a source:"system" code:"gateway-error" record while browsing',
    ).toBeDefined();
  });

  test('SE-01 | A request with no captured raw error is mapped to system/unknown', async ({ request }) => {
    const { getReqData } = await pollGetRequest(request, unknownFixture!.requestID, 1, 1);

    expect(getReqData.error).toEqual([]);
    expect(Array.isArray(getReqData.formattedError)).toBeTruthy();

    for (const formatted of getReqData.formattedError) {
      expect(formatted).toHaveProperty('source');
      expect(formatted).toHaveProperty('code');
      expect(formatted).toHaveProperty('message');
    }
    expect(getReqData.formattedError).toContainEqual({
      source: 'system',
      code: 'unknown',
      message: 'An error has occurred',
    });

    // No duplicate (source, code, message) combinations
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const keys = getReqData.formattedError.map((f: any) => `${f.source}|${f.code}|${f.message}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  test('SE-02 | An unparsed upstream gateway error is mapped to system/gateway-error', async ({ request }) => {
    const { getReqData } = await pollGetRequest(request, gatewayFixture!.requestID, 1, 1);

    expect(Array.isArray(getReqData.error)).toBeTruthy();
    expect(getReqData.error.length).toBeGreaterThan(0);
    expect(Array.isArray(getReqData.formattedError)).toBeTruthy();

    for (const formatted of getReqData.formattedError) {
      expect(formatted).toHaveProperty('source');
      expect(formatted).toHaveProperty('code');
      expect(formatted).toHaveProperty('message');
    }
    expect(getReqData.formattedError).toContainEqual({
      source: 'system',
      code: 'gateway-error',
      message: 'Upstream service unavailable (502)',
    });

    // No duplicate (source, code, message) combinations
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const keys = getReqData.formattedError.map((f: any) => `${f.source}|${f.code}|${f.message}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

// Every PLCB account (filterValue: "PLCB") hits the identical S/4 "Tolerance Group" error
// regardless of that account's own data — the same failure for every customer looks more
// like an environmental/config problem than a genuine per-record business validation error,
// which raises the question of whether CUSTOMER-132 intends this to be source:"system" too.
// These tests capture both sides: PLCB-01 locks in what the system does today, PLCB-02
// checks the system:"system" hypothesis directly so the gap (if any) is explicit evidence
// for dev rather than an assumption.
test.describe('CUSTOMER-132 | PLCB "Tolerance Group" error — business error or infra error?', () => {
  let plcbRequestIDs: string[] = [];

  test.beforeAll(async ({ request }) => {
    test.setTimeout(60_000);

    const { body } = await browseCustomers(request, {
      sortToken: 'name',
      sortDirection: 'desc',
      pageSize: 100,
      state: '',
      filterValue: 'PLCB',
    });

    plcbRequestIDs = (body.records ?? [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((r: any) => r.status === 'Error' && r.requestID)
      .slice(0, 3)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((r: any) => r.requestID);

    expect(plcbRequestIDs.length, 'Expected at least one Error-state PLCB record').toBeGreaterThan(0);
  });

  test('PLCB-01 | Current behavior: PLCB "Tolerance Group" error is tagged salesforce+s4, not system, and is identical across accounts', async ({
    request,
  }) => {
    const expectedFormattedError = [
      { source: 'salesforce', code: 'BAD_REQUEST', message: 'Invalid request data' },
      {
        source: 's4',
        code: 'CVI_API/001',
        message: 'Tolerance Group: Invalid value (foreign key check failed)',
      },
    ];

    for (const requestID of plcbRequestIDs) {
      const { getReqData } = await pollGetRequest(request, requestID, 1, 1);

      expect(Array.isArray(getReqData.error)).toBeTruthy();
      expect(getReqData.error.length).toBeGreaterThan(0);

      // Unlike CUSTOMER-113's business-duplicate case, not every formatted message here
      // traces back verbatim to a raw error message: the s4 entry preserves the raw SAP
      // text as-is, but the salesforce entry is normalized to a generic "Invalid request
      // data" rather than passing through the raw "Request failed with status code 400".
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rawMessages = getReqData.error.map((e: any) => e.message);
      expect(rawMessages).toContain('Tolerance Group: Invalid value (foreign key check failed)');

      // Identical formattedError shape for every PLCB account sampled, regardless of
      // that account's own data — this is the "strange"/consistent part.
      expect(getReqData.formattedError).toEqual(expect.arrayContaining(expectedFormattedError));
      expect(getReqData.formattedError.length).toBe(expectedFormattedError.length);
    }
  });

  test('PLCB-02 | CUSTOMER-132 hypothesis: today this is NOT tagged source:"system", despite firing identically for every PLCB account', async ({
    request,
  }) => {
    for (const requestID of plcbRequestIDs) {
      const { getReqData } = await pollGetRequest(request, requestID, 1, 1);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const systemEntries = (getReqData.formattedError ?? []).filter((f: any) => f.source === 'system');
      expect(
        systemEntries,
        `requestID ${requestID}: expected NO source:"system" entries under current behavior — ` +
          'if this fails, the mapping has changed and PLCB may now be treated as an infra error.',
      ).toHaveLength(0);
    }
  });
});
