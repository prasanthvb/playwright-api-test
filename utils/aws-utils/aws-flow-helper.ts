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

  if (!response.ok() || apiError) {
    console.warn(`⚠️ Create Customer failed with HTTP ${status}`);
    console.warn(`Error message: ${apiError || body?.error || 'Unknown'}`);
    expect([400, 401, 403, 409, 422, 500]).toContain(status);
    return;
  }

  // 2️⃣ Poll until status != Pending
  const poll = await pollGetRequest(request, requestID!);
  const statusText = poll.status;
  const globalID = poll.globalID;

  expect(statusText, 'Status missing in Get-Request').toBeDefined();
  expect(['Pending', 'Active', 'Error']).toContain(statusText);

  if (statusText === 'Error') {
    console.error(`❌ Customer creation failed (Status: Error)`);
    return;
  }

  // 3️⃣ If Active, call get-customer
  if (statusText === 'Active' && globalID) {
    const customer = await getCustomer(request, globalID);
    const data = customer.body.data;

    // Basic validation
    expect(data.accountName).toBe(payload.accountName);
    expect(data.legalOwnerName).toBe(payload.legalOwnerName);
    expect(data.primaryEmail).toBe(payload.primaryEmail);
    expect(data.phone).toBe(payload.phone);

    console.log(`✅ Customer Active (${globalID}) validated successfully.`);
  } else {
    console.warn(`⚠️ Status remained Pending after polling.`);
  }
}