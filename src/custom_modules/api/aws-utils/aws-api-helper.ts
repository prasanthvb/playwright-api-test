import { APIRequestContext, expect } from "@playwright/test";
import apiPaths from "../../../data/api-data/api-path.json";
import { awsConfig } from "../../../../config/api-config";

const baseUrl = awsConfig.baseUrl;
const apiKey = awsConfig.apiKey;

// Helper to add API key header
function authHeaders() {
  return {
    "x-api-key": apiKey ?? "",
  };
}

/**Create Customer API */
export async function createCustomer(request: APIRequestContext, payload: any) {
  //   console.log(`Create Customer URL: ${baseUrl}${apiPaths['aws-create-customer']}`);
  //   console.log('Create Payload:', JSON.stringify(payload, null, 2));

  const response = await request.post(
    `${baseUrl}${apiPaths["aws-create-customer"]}`,
    {
      headers: authHeaders(),
      data: payload,
      timeout: 60_000,
    }
  );

  const status = response.status();
  let body: any = {};
  try {
    body = await response.json();
  } catch {
    console.warn("⚠️ Response not JSON");
  }

  const errorMessage =
    body?.error || body?.message === "Error" ? body?.error : null;

  //   console.log('Create Customer Response:', JSON.stringify(body, null, 2));

  return {
    response,
    status,
    body,
    apiError: errorMessage,
    requestID: body?.data?.requestID || body?.requestID || null,
  };
}

/** Poll Get-Request API until status changes */
export async function pollGetRequest(
  request: APIRequestContext,
  requestID: string,
  maxRetries = 15,
  intervalSec = 5
) {
  let status: string | undefined;
  let globalID: string | undefined;
  let getReqData: any = {};
  let alcoholLicenseNumber: string | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const getReqResponse = await request.get(
      `${baseUrl}${apiPaths["aws-get-request"]}`,
      {
        headers: authHeaders(),
        data: { requestID },
        timeout: 30_000,
      }
    );

    getReqData = await getReqResponse.json().catch(() => ({}));
    status = getReqData?.data?.status;
    globalID = getReqData?.data?.globalID;
    alcoholLicenseNumber = getReqData?.data?.alcoholLicenseNumber;

    // console.log(
    //   `🔁 Attempt ${attempt}/${maxRetries} → Status=${status || 'N/A'}, GlobalID=${globalID || 'N/A'}`
    // );

    if (status === "Active" || status === "Error") break;
    await new Promise((r) => setTimeout(r, intervalSec * 1000));
  }

  return { status, globalID ,getReqData, alcoholLicenseNumber };
}

/** Get Customer by globalID */
export async function getCustomerByGlobalID(
  request: APIRequestContext,
  globalID: string
) {
  const getCustomerRes = await request.get(
    `${baseUrl}${apiPaths["aws-get-customer"]}`,
    {
      headers: authHeaders(),
      data: { globalID },
      timeout: 30_000,
    }
  );

  const body = await getCustomerRes.json().catch(() => ({}));
  //   console.log('Get Customer Response:', JSON.stringify(body, null, 2));

  expect(getCustomerRes.ok(), "Get Customer API failed").toBeTruthy();

  return { getCustomerRes, body };
}

/** Get Customer by globalID */
export async function getCustomerByLicenceNumber(
  request: APIRequestContext,
  alcoholLicenseNumber: string
) {
  const getCustomerResponse = await request.get(
    `${baseUrl}${apiPaths["aws-get-customer"]}`,
    {
      headers: authHeaders(),
      data: { alcoholLicenseNumber },
      timeout: 30_000,
    }
  );

  const status = getCustomerResponse.status();
  const body = await getCustomerResponse.json().catch(() => ({}));

  // Allowed 500 error scenario
  const isExpected500Error =
    status === 500 &&
    body?.message === "Error" &&
    typeof body?.error === "string" &&
    body.error.includes("Multiple customers with licenseID");

  // ❌ Any unexpected failure → throw
  if (status !== 200 && !isExpected500Error) {
    throw new Error(
      `Unexpected failure in Get Customer API.
       Status: ${status}
       Response: ${JSON.stringify(body, null, 2)}`
    );
  }

  // ✔ Expected 500 duplicate-license error
  if (isExpected500Error) {
    return {
    getCustomerResponse,
    body,
    };
  }

  // ✔ 200 OK → return full success body
  return {
    getCustomerResponse,
    body,
  };
}

// --- Helper to send Browse Customer requests ---
export async function browseCustomers(
  request: APIRequestContext,
  payload: any
) {
//   console.log(
//     `Browse Customer URL: ${baseUrl}${apiPaths["aws-browser-customer"]}`
//   );
//   console.log("Browse Payload:", JSON.stringify(payload, null, 2));
  const response = await request.get(
    `${baseUrl}${apiPaths["aws-browse-customer"]}`,
    {
      headers: authHeaders(),
      data: payload,
      timeout: 60_000,
    }
  );
  const status = response.status();
  const body = await response.json().catch(() => ({}));
//   console.log(`Browse Customer → HTTP ${response.status()}`);
//   console.log("Request:", JSON.stringify(payload, null, 2));
//   console.log("Response:", JSON.stringify(body, null, 2));

  return { response, status, body };
}
