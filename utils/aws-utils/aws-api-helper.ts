import { APIRequestContext, expect } from '@playwright/test';
import apiPaths from "../../fixtures/api-path.json";

const baseUrl = process.env.AWS_BASE_URL;
const apiKey = process.env.AWS_API_KEY;

export function authHeaders(valid = true) {
  return {
    'Content-Type': 'application/json',
    'x-api-key': valid ? (apiKey ?? '') : 'INVALID_KEY',
  };
}

/**
 * Create a new customer
 */
export async function createCustomer(request: APIRequestContext, payload: any) {
  console.log(`Create Customer URL: ${baseUrl}${apiPaths['aws-create-customer']}`);
  const response = await request.post(`${baseUrl}${apiPaths['aws-create-customer']}`, {
    headers: authHeaders(),
    data: payload,
    timeout: 60_000,
  });

  const status = response.status();
  let body: any = {};
  try {
    body = await response.json();
  } catch (err) {
    console.warn('⚠️ Response is not JSON');
  }

  // Check if the API failed or validation failed
  const apiError = body?.error || body?.message === 'Error' ? body?.error : null;

  // Log the API response
  console.log('Create Customer Response:', JSON.stringify(body, null, 2));

  // Return all useful data
  return {
    response,
    status,
    body,
    apiError,
    requestID: body?.data?.requestID,
  };
}

/**
 * Poll Get-Request until status changes or timeout
 */
export async function pollGetRequest(request: APIRequestContext, requestID: string, maxRetries = 10, intervalSec = 5) {
  let status: string | undefined;
  let globalID: string | undefined;
  let lastResponse: any = {};

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const response = await request.get(`${baseUrl}${apiPaths['aws-get-request']}`, {
      headers: authHeaders(),
      data: { requestID },
    });

    const body = await response.json().catch(() => ({}));
    lastResponse = body;
    status = body?.data?.status;
    globalID = body?.data?.globalID;

    console.log(`Attempt ${attempt}: Status=${status || 'N/A'}, GlobalID=${globalID || 'N/A'}`);

    if (status === 'Active' || status === 'Error') break;
    await new Promise((r) => setTimeout(r, intervalSec * 1000));
  }

  return { status, globalID, lastResponse };
}

/**
 * Get Customer details by globalID
 */
export async function getCustomer(request: APIRequestContext, globalID: string) {
  const response = await request.get(`${baseUrl}${apiPaths['aws-get-customer']}`, {
    headers: authHeaders(),
    data: { globalID },
    timeout: 30_000,
  });

  const body = await response.json().catch(() => ({}));
  console.log('Get Customer Response:', body);
  expect(response.ok(), 'Get Customer API failed').toBeTruthy();
  return { response, body };
}
