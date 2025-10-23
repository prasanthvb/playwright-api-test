import { APIRequestContext, expect } from '@playwright/test';
import { createCustomer, pollGetRequest, getCustomer } from './aws-api-helper';

/**
 * Shared reusable full flow for AWS Customer API
 */
export async function runFullFlow(
  request: APIRequestContext,
  payload: any,
  description: string
) {
  console.log(`\n🚀 Running Scenario: ${description}`);

  // 1️⃣ Create Customer
  const { status, requestID, apiError, body, response } = await createCustomer(request, payload);
  console.log(`CreateCustomer → HTTP ${status}`);

  if (!response.ok() || apiError) {
    console.warn(`⚠️ Create Customer failed with HTTP ${status}`);
    console.warn(`Error message: ${apiError || 'Unknown'}`);
    return { status, apiError, requestID: null, getRequestStatus: null, globalID: null, getCustomerStatus: null };
  }

  if (!requestID) {
    console.warn('⚠️ No requestID returned, cannot continue flow.');
    return { status, apiError, requestID, getRequestStatus: null, globalID: null, getCustomerStatus: null };
  }

  // 2️⃣ Poll Get-Request until Active/Error
  const pollResult = await pollGetRequest(request, requestID);
  const getRequestStatus = pollResult.status;
  const globalID = pollResult.globalID;
  const getReqData = pollResult.getReqData;

  console.log(`📊 Polling Complete → Status=${getRequestStatus || 'N/A'}, GlobalID=${globalID || 'N/A'}`);

  let getCustomerStatus: number | null = null;

  // 3️⃣ If Active, verify customer details
  if (getRequestStatus === 'Active' && globalID) {
    const customer = await getCustomer(request, globalID);
    getCustomerStatus = customer.getCustomerRes.status();
    const data = customer.body.data;

    expect(data).toBeDefined();
    expect(data.accountName).toBe(payload.accountName);
    expect(data.legalOwnerName).toBe(payload.legalOwnerName);
    expect(data.firstName).toBe(payload.firstName);
    expect(data.lastName).toBe(payload.lastName);
    expect(data.primaryEmail).toBe(payload.primaryEmail);
    expect(data.phone).toBe(payload.phone);
    expect(data.alcoholLicenseNumber).toBe(payload.alcoholLicenseNumber);
    expect(data.Address?.addressLine1).toBe(payload.Address.addressLine1);
    expect(data.Address?.city).toBe(payload.Address.city);
    expect(data.Address?.state).toBe(payload.Address.state);
    expect(data.Address?.postalCode).toBe(payload.Address.postalCode);
    expect(data.Address?.country).toBe(payload.Address.country);
    expect(data.Address?.county).toBe(payload.Address.county);
    expect(data.status).toBe('Active');
    expect(data.globalID).toBe(globalID);
    expect(data.requestID).toBe(requestID);

    console.log(`✅ Customer Active (${globalID}) verified successfully with 200 OK`);
  } else if (getRequestStatus === 'Error') {
    console.error('❌ Customer creation failed (Status: Error)');
  } else {
    console.warn('⏳ Customer remained Pending after retries.');
  }

  return { status, apiError, requestID, getRequestStatus, globalID, getReqData, getCustomerStatus };
}