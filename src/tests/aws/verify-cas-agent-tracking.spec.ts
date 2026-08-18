import { test, expect } from '@playwright/test';
import apiPaths from '../../data/api-data/api-path.json';
import { generatePayloadWithFakerData } from '../../custom_modules/api/payload/generate-new-customer-payload';
import { runFullFlow } from '../../custom_modules/api/aws-utils/aws-flow-helper';
import { pollGetUpdateRequest } from '../../custom_modules/api/aws-utils/aws-get-update-request-helper';
import { getValidBillingAddressPayload } from '../../custom_modules/api/payload/update-billing-address-payload';
import { decodeAuthToken } from '../../custom_modules/api/aws-utils/token-utils';
import { awsConfig, getAuthHeaders } from '../../../config/api-config';

const baseUrl = awsConfig.baseUrl;

test.describe('CUSTOMER-77 | Verify CAS agent is captured on request and update_request', () => {
  test('CAS-01 | request record has agentID matching the authenticated caller email', async ({ request }) => {
    const expectedEmail = decodeAuthToken().email;
    expect(expectedEmail).toBeTruthy();

    const payload = await generatePayloadWithFakerData();
    const result = await runFullFlow(request, payload, 'CAS agent tracking - create');

    expect(result.status).toBe(200);
    expect(result.getRequestStatus).toContain('Active');
    expect(result.getReqData?.agentID).toBe(expectedEmail);
  });

  test('CAS-02 | update_request record has agentId matching the authenticated caller email', async ({ request }) => {
    const expectedEmail = decodeAuthToken().email;
    expect(expectedEmail).toBeTruthy();

    const payload = await generatePayloadWithFakerData();
    const createResult = await runFullFlow(request, payload, 'CAS agent tracking - create for update');
    expect(createResult.getRequestStatus).toContain('Active');
    const globalID = createResult.globalID;
    expect(globalID).toBeTruthy();

    const billingPayload = getValidBillingAddressPayload();
    const updateResponse = await request.patch(
      `${baseUrl}${apiPaths['update-customer-account-details']}/${globalID}?action=billingAddress`,
      { data: billingPayload, headers: getAuthHeaders() },
    );
    expect(updateResponse.status()).toBe(200);

    const updateBody = await updateResponse.json();
    expect(updateBody.updateRequestID).toBeTruthy();

    const updateRequestStatus = await pollGetUpdateRequest(request, updateBody.updateRequestID, globalID as string);

    expect(updateRequestStatus?.data?.status).toBe('Active');
    expect(updateRequestStatus?.agentId).toBe(expectedEmail);
    expect(updateRequestStatus?.data?.request?.agentId).toBe(expectedEmail);
  });
});
