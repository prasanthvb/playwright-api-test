import { test, expect } from '@playwright/test';
import apiPaths from '../../data/api-data/api-path.json';
import { generatePayloadWithFakerData } from '../../custom_modules/api/payload/generate-new-customer-payload';
import { runFullFlow } from '../../custom_modules/api/aws-utils/aws-flow-helper';
import { getValidBillingAddressPayload } from '../../custom_modules/api/payload/update-billing-address-payload';
import { decodeAuthToken } from '../../custom_modules/api/aws-utils/token-utils';
import { awsConfig, getAuthHeaders, getAdminAuthHeaders } from '../../../config/api-config';

const baseUrl = awsConfig.baseUrl;

test.describe('CUSTOMER-115 | Verify Admin Audit API', () => {
  let globalID: string;
  let updateRequestID: string;

  test.beforeAll(async ({ request }) => {
    // Create a customer and perform one update so there's a known, fresh audit trail to query.
    const payload = await generatePayloadWithFakerData();
    const createResult = await runFullFlow(request, payload, 'CUSTOMER-115 setup - create');
    expect(createResult.getRequestStatus).toContain('Active');
    expect(createResult.globalID).toBeTruthy();
    globalID = createResult.globalID as string;

    const billingPayload = getValidBillingAddressPayload();
    const updateResponse = await request.patch(
      `${baseUrl}${apiPaths['update-customer-account-details']}/${globalID}?action=billingAddress`,
      { data: billingPayload, headers: getAuthHeaders() },
    );
    expect(updateResponse.status()).toBe(200);
    const updateBody = await updateResponse.json();
    expect(updateBody.updateRequestID).toBeTruthy();
    updateRequestID = updateBody.updateRequestID;

    // Give the audit trail a moment to be written before querying it.
    await new Promise((r) => setTimeout(r, 15_000));
  });

  test('AA-01 | GET /admin/audit/customer/{id} returns records for that customer', async ({ request }) => {
    const response = await request.get(`${baseUrl}${apiPaths['admin-audit-customer']}/${globalID}`, {
      headers: getAdminAuthHeaders(),
    });

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(Array.isArray(body.records)).toBeTruthy();
    expect(body.records.length).toBeGreaterThan(0);

    for (const record of body.records) {
      expect(record.customerId).toBe(globalID);
      expect(record).toHaveProperty('requestId');
      expect(record).toHaveProperty('status');
      expect(record).toHaveProperty('agentId');
      expect(record).toHaveProperty('requestedAt');
      expect(record).toHaveProperty('completedAt');
      expect(record).toHaveProperty('action');
    }

    // The billing address update from beforeAll must be in the audit trail
    const billingRecord = body.records.find((r: { requestId: string }) => r.requestId === updateRequestID);
    expect(billingRecord).toBeDefined();
    expect(billingRecord.action).toBe('billingaddress');
  });

  test('AA-02 | GET /admin/audit/agent/{id} returns records for that agent', async ({ request }) => {
    const expectedEmail = decodeAuthToken().email;
    expect(expectedEmail).toBeTruthy();

    const response = await request.get(
      `${baseUrl}${apiPaths['admin-audit-agent']}/${encodeURIComponent(expectedEmail!)}`,
      {
        headers: getAdminAuthHeaders(),
      },
    );

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(Array.isArray(body.records)).toBeTruthy();
    expect(body.records.length).toBeGreaterThan(0);

    for (const record of body.records) {
      expect(record.agentId).toBe(expectedEmail);
    }

    // The billing address update from beforeAll must be in this agent's audit trail too
    const billingRecord = body.records.find((r: { requestId: string }) => r.requestId === updateRequestID);
    expect(billingRecord).toBeDefined();
    expect(billingRecord.customerId).toBe(globalID);
  });

  test('AA-03 | GET /admin/audit/agent/{id} respects pageSize and returns a nextToken when more records exist', async ({
    request,
  }) => {
    const expectedEmail = decodeAuthToken().email;
    expect(expectedEmail).toBeTruthy();

    const response = await request.get(
      `${baseUrl}${apiPaths['admin-audit-agent']}/${encodeURIComponent(expectedEmail!)}`,
      {
        headers: getAdminAuthHeaders(),
        params: { pageSize: 2, sortDirection: 'desc' },
      },
    );

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(Array.isArray(body.records)).toBeTruthy();
    expect(body.records.length).toBeLessThanOrEqual(2);

    // This agent has well over 2 audit records in QA, so a page of 2 must be followed by a nextToken
    if (body.records.length === 2) {
      expect(body.nextToken).toBeTruthy();
    }

    // sortDirection=desc → requestedAt should be non-increasing across the page
    const timestamps = body.records.map((r: { requestedAt: string }) => new Date(r.requestedAt).getTime());
    const sortedDesc = [...timestamps].sort((a, b) => b - a);
    expect(timestamps).toEqual(sortedDesc);
  });
});
