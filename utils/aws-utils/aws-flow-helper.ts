import { APIRequestContext, expect } from "@playwright/test";
import { createCustomer, pollGetRequest, getCustomer } from "./aws-api-helper";

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
  const { status, requestID, apiError, body, response } = await createCustomer(
    request,
    payload
  );
  console.log(`CreateCustomer → HTTP ${status}`);

  if (!response.ok() || apiError) {
    console.warn(`⚠️ Create Customer failed with HTTP ${status}`);
    console.warn(`Error message: ${apiError || "Unknown"}`);
    return {
      status,
      apiError,
      requestID: null,
      getRequestStatus: null,
      globalID: null,
      getCustomerStatus: null,
    };
  }

  if (!requestID) {
    console.warn("⚠️ No requestID returned, cannot continue flow.");
    return {
      status,
      apiError,
      requestID,
      getRequestStatus: null,
      globalID: null,
      getCustomerStatus: null,
    };
  }

  // 2️⃣ Poll Get-Request until Active/Error
  const pollResult = await pollGetRequest(request, requestID);
  const getRequestStatus = pollResult.status;
  const globalID = pollResult.globalID;
  const getReqData = pollResult.getReqData;

  console.log(
    `📊 Polling Complete → Status=${getRequestStatus || "N/A"}, GlobalID=${
      globalID || "N/A"
    }`
  );

  let getCustomerStatus: number | null = null;

  // 3️⃣ If Active, verify customer details
  if (getRequestStatus === "Active" && globalID) {
    const customer = await getCustomer(request, globalID);
    getCustomerStatus = customer.getCustomerRes.status();
    const data = customer.body;

    expect(data).toBeDefined();
    expect(
      data.customerName
        ?.toUpperCase()
        .replace(/\s*&\s*/g, "&") // normalize spaces around &
        .replace(/\s*AND\s*/g, "&") // convert "AND" to "&"
        .trim()
    ).toBe(
      payload.accountName
        ?.toUpperCase()
        .replace(/\s*&\s*/g, "&")
        .replace(/\s*AND\s*/g, "&")
        .trim()
    );
    expect(data.legalOwnerName).toBe(payload.legalOwnerName.toUpperCase());
    expect(data.license?.number).toBe(payload.alcoholLicenseNumber);
    expect(data.address?.city).toBe(payload.Address?.[0]?.city?.toUpperCase());
    expect(data.address?.state).toBe(
      payload.Address?.[0]?.state?.toUpperCase()
    );
    expect(data.address?.postalCode).toBe(payload.Address?.[0]?.postalCode);
    expect(data.address?.country).toBe(
      payload.Address?.[0]?.country?.toUpperCase()
    );
    expect(data.address?.county).toBe(
      payload.Address?.[0]?.county.toUpperCase()
    );
    expect(data.globalID).toBe(globalID);

    console.log(
      `✅ Customer Active (${globalID}) verified successfully with 200 OK`
    );
  } else if (getRequestStatus === "Error") {
    console.error("❌ Customer creation failed (Status: Error)");
  } else {
    console.warn("⏳ Customer remained Pending after retries.");
  }

  return {
    status,
    apiError,
    requestID,
    getRequestStatus,
    globalID,
    getReqData,
    getCustomerStatus,
  };
}
