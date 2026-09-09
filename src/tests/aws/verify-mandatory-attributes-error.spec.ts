/* eslint-disable no-console */
import { test, expect, APIRequestContext } from '@playwright/test';
import { generatePayloadWithFakerData, Payload } from '../../custom_modules/api/payload/generate-new-customer-payload';
import { createCustomer, pollGetRequest } from '../../custom_modules/api/aws-utils/aws-api-helper';

// Exact string the API returns on the request-get record (note the "on" typo is the API's own).
const MANDATORY_MSG = /missing on(?:e)? or more mandatory attributes/i;
// Synchronous 500 guard for omitted top-level keys.
const REQUIRED_FIELDS_MSG = /^missing required fields:/i;

async function submit(request: APIRequestContext, payload: Payload) {
  const create = await createCustomer(request, payload);
  const postError: string = create.body?.error ?? '';
  const inPost = MANDATORY_MSG.test(JSON.stringify(create.body ?? {}));

  let status: string | undefined;
  let globalID: string | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let getReqData: any = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let rawErrors: any[] = [];

  if (create.requestID) {
    const poll = await pollGetRequest(request, create.requestID as string, 20, 5);
    ({ status, globalID, getReqData } = poll);
    rawErrors = getReqData?.data?.error ?? getReqData?.error ?? [];
  }
  const inGetRequest = rawErrors.some((e: { message?: string }) => MANDATORY_MSG.test(e?.message ?? ''));

  return { create, postError, inPost, inGetRequest, status, globalID, getReqData, rawErrors };
}

function removeField(payload: Payload, field: string) {
  const [head, tail] = field.split('.');
  if (tail) delete (payload.Address[0] as unknown as Record<string, unknown>)[tail];
  else delete (payload as unknown as Record<string, unknown>)[head];
}

// Omitting one of these Address sub-fields is accepted by POST but fails downstream with the
// "Missing on or more mandatory attributes." error on the request-get record.
const ADDRESS_MANDATORY = ['addressLine1', 'city', 'state', 'postalCode', 'country'] as const;

// Omitting one of these top-level keys is rejected synchronously by POST with HTTP 500
// "Missing required fields: <name>" — a different guard, never reaches request-get / get-customer.
const TOP_LEVEL_REQUIRED = [
  'accountName',
  'legalOwnerName',
  'distributionChannel',
  'contactFirstName',
  'contactLastName',
  'primaryEmail',
  'phone',
  'alcoholLicenseNumber',
  'licenseType',
] as const;

test.describe('Create Customer | "Missing on or more mandatory attributes" — mandatory Address sub-fields', () => {
  ADDRESS_MANDATORY.forEach((sub, i) => {
    const id = `MA-A${String(i + 1).padStart(2, '0')}`;
    test(`${id} | Address.${sub} omitted → error on request-get, no customer created`, async ({ request }) => {
      test.setTimeout(180_000);
      const payload = await generatePayloadWithFakerData();
      removeField(payload, `Address.${sub}`);

      const r = await submit(request, payload);

      // POST accepts it and hands back a requestID to poll.
      expect(r.create.status).toBe(200);
      expect(r.create.requestID).toBeTruthy();

      // The request settles as Error carrying the exact mandatory-attributes message.
      expect(r.status).toBe('Error');
      expect(r.inGetRequest, 'expected "Missing on or more mandatory attributes." in request-get error[]').toBeTruthy();
      expect(
        r.rawErrors.some(
          (e: { error?: string; message?: string }) =>
            /mandatory attribute/i.test(e?.error ?? '') && MANDATORY_MSG.test(e?.message ?? ''),
        ),
      ).toBeTruthy();

      // No customer is produced, so get-customer can never be the source of this error.
      expect(r.status).not.toBe('Active');
      expect(r.globalID ?? '').toBeFalsy();
    });
  });

  test('MA-A20 | Several mandatory Address sub-fields missing still yields one mandatory-attributes error', async ({
    request,
  }) => {
    test.setTimeout(180_000);
    const payload = await generatePayloadWithFakerData();
    removeField(payload, 'Address.city');
    removeField(payload, 'Address.state');
    removeField(payload, 'Address.postalCode');

    const r = await submit(request, payload);

    expect(r.create.status).toBe(200);
    expect(r.status).toBe('Error');
    expect(r.inGetRequest).toBeTruthy();
    const mandatoryEntries = r.rawErrors.filter((e: { message?: string }) => MANDATORY_MSG.test(e?.message ?? ''));
    expect(mandatoryEntries.length).toBe(1);
  });
});

test.describe('Create Customer | Omitted top-level required keys — synchronous 500 (a different guard)', () => {
  TOP_LEVEL_REQUIRED.forEach((field, i) => {
    const id = `MA-B${String(i + 1).padStart(2, '0')}`;
    test(`${id} | ${field} omitted → HTTP 500 "Missing required fields: ${field}", no request created`, async ({
      request,
    }) => {
      test.setTimeout(120_000);
      const payload = await generatePayloadWithFakerData();
      removeField(payload, field);

      const r = await submit(request, payload);

      expect(r.create.status).toBe(500);
      expect(r.postError).toMatch(REQUIRED_FIELDS_MSG);
      expect(r.postError).toContain(field);
      expect(r.create.requestID ?? null).toBeNull();
      // This guard fires before any request-get / get-customer record exists.
      expect(r.inGetRequest).toBeFalsy();
    });
  });

  test('MA-B20 | Several top-level keys missing are reported together in one 500', async ({ request }) => {
    test.setTimeout(120_000);
    const payload = await generatePayloadWithFakerData();
    removeField(payload, 'accountName');
    removeField(payload, 'legalOwnerName');
    removeField(payload, 'phone');

    const r = await submit(request, payload);

    expect(r.create.status).toBe(500);
    expect(r.postError).toMatch(REQUIRED_FIELDS_MSG);
    for (const f of ['accountName', 'legalOwnerName', 'phone']) expect(r.postError).toContain(f);
  });
});

test.describe('Create Customer | mandatory-attributes error — negative / control cases', () => {
  test('MA-C01 | Address.county is NOT mandatory — omitting it does not raise the error', async ({ request }) => {
    test.setTimeout(180_000);
    const payload = await generatePayloadWithFakerData();
    removeField(payload, 'Address.county');

    const r = await submit(request, payload);

    expect(r.create.status).toBe(200);
    expect(r.inPost || r.inGetRequest, 'county is optional — no mandatory-attributes error expected').toBeFalsy();
  });

  test('MA-C02 | Fully-populated payload never returns the mandatory-attributes error', async ({ request }) => {
    test.setTimeout(180_000);
    const payload = await generatePayloadWithFakerData();

    const r = await submit(request, payload);

    expect(r.inPost).toBeFalsy();
    expect(r.inGetRequest).toBeFalsy();
  });

  test('MA-C03 | When the error fires, no globalID exists → get-customer is never its carrier', async ({ request }) => {
    test.setTimeout(180_000);
    const payload = await generatePayloadWithFakerData();
    removeField(payload, 'Address.city');

    const r = await submit(request, payload);

    expect(r.inGetRequest).toBeTruthy();
    expect(r.globalID ?? '').toBeFalsy();
    expect(r.getReqData?.data?.status).not.toBe('Active');
  });

  test('MA-C04 | request-get error entry is well-formed ({error,message}) and status is Error', async ({ request }) => {
    test.setTimeout(180_000);
    const payload = await generatePayloadWithFakerData();
    removeField(payload, 'Address.postalCode');

    const r = await submit(request, payload);

    expect(Array.isArray(r.rawErrors)).toBeTruthy();
    expect(r.rawErrors.length).toBeGreaterThan(0);
    const entry = r.rawErrors.find((e: { message?: string }) => MANDATORY_MSG.test(e?.message ?? ''));
    expect(entry, 'a mandatory-attributes entry must be present').toBeTruthy();
    expect(entry).toHaveProperty('error');
    expect(entry).toHaveProperty('message');
    expect(entry.error).toMatch(/mandatory attribute/i);
  });
});

// One-time discovery harness. Un-skip to re-characterise which fields/representations produce
// which guard message if the API contract changes. Not part of the regression signal.
test.describe.skip('Create Customer | DISCOVERY: where each missing-field guard surfaces', () => {
  const ALL_FIELDS = [
    'accountName',
    'legalOwnerName',
    'distributionChannel',
    'Address.addressLine1',
    'Address.city',
    'Address.county',
    'Address.state',
    'Address.postalCode',
    'Address.country',
    'contactFirstName',
    'contactLastName',
    'primaryEmail',
    'phone',
    'alcoholLicenseNumber',
    'licenseType',
  ];
  for (const field of ALL_FIELDS) {
    test(`DISCOVERY | ${field} omitted`, async ({ request }) => {
      test.setTimeout(180_000);
      const payload = await generatePayloadWithFakerData();
      removeField(payload, field);
      const r = await submit(request, payload);
      console.log(
        JSON.stringify(
          {
            field,
            postStatus: r.create.status,
            postBody: r.create.body,
            getReqStatus: r.status,
            getReqError: r.rawErrors,
            layer: r.inPost ? 'POST' : r.inGetRequest ? 'get-request' : 'neither',
          },
          null,
          2,
        ),
      );
    });
  }
});
