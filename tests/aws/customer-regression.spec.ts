import * as dotenv from "dotenv";

dotenv.config();
import { test, expect } from "@playwright/test";
import apiPaths from "../../fixtures/api-path.json";
import { generatePayloadWithFakerData } from "../../utils/payload/generate-new-customer-payload";
import { awsConfig } from '../../config/api-config';

const baseUrl = awsConfig.baseUrl;
const apiKey = awsConfig.apiKey;
console.log("API Key:", apiKey);

// Helper to add API key header
function authHeaders() {
  return {
    "x-api-key": apiKey ?? "",
  };
}

test.describe("AWS Customer API - Regression Flow", () => {
  test("End-to-End Regression Flow", async ({ request }) => {
    // 1 - Create Customer
    const payload = await generatePayloadWithFakerData();
    console.log("Create Payload:", payload);
    const createCustomerURL = `${baseUrl}${apiPaths["aws-create-customer"]}`;
    const createResponse = await request.post(createCustomerURL, {
      headers: authHeaders(),
      data: payload,
      timeout: 60_000,
    });
    const createBody = await createResponse.json().catch(() => ({}));
    console.log("Create Customer Response:", createBody);

    expect(createResponse.ok()).toBeTruthy();
    expect(createBody.success).toBeTruthy();

    const requestID = createBody.requestID || createBody.data?.requestID;
    expect(requestID).toBeDefined();
    console.log("Request ID:", requestID);

    // 2 - Poll Get-Request until status changes
    let status: string | undefined = undefined;
    let globalID: string | undefined = undefined;
    const maxAttempts = 10;
    const delayMs = 5000;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const getReqResponse = await request.get(
        `${baseUrl}${apiPaths["aws-get-request"]}`,
        {
          headers: authHeaders(),
          data: { requestID },
        }
      );

      const getReqData = await getReqResponse.json().catch(() => ({}));
      status = getReqData?.data?.status;
      globalID = getReqData?.data?.globalID;

      console.log(
        `Attempt ${attempt}: Status = ${status || "N/A"}, GlobalID = ${
          globalID || "N/A"
        }`
      );

      if (status === "Active" || status === "Error") break;
      await new Promise((r) => setTimeout(r, delayMs));
    }

    // Validate final status
    if (!status) throw new Error("Status is missing in Get-Request response");
    if (status === "Pending") {
      console.warn("Status remained Pending after max retries.");
    }
    expect(["Active", "Error", "Pending"]).toContain(status);

    // 3 - If Active → Get Customer details
    if (status === "Error") {
      console.error("Error creating customer. No globalID found.");
      return;
    }

    expect(globalID).toBeTruthy();
    console.log("Customer Active. Global ID:", globalID);

    const getCustomerRes = await request.get(
      `${baseUrl}${apiPaths["aws-get-customer"]}`,
      {
        headers: authHeaders(),
        data: { globalID },
        timeout: 30_000,
      }
    );

    expect(getCustomerRes.ok()).toBeTruthy();
    const getCustomerData = await getCustomerRes.json();
    console.log("Get Customer Response:", getCustomerData);

    // 4 - Validate key fields match Create payload
    const created = payload;
    const fetched = getCustomerData.data;

    expect(fetched.accountName).toBe(created.accountName);
    expect(fetched.legalOwnerName).toBe(created.legalOwnerName);
    expect(fetched.contactFirstName).toBe(created.contactFirstName);
    expect(fetched.contactLastName).toBe(created.contactLastName);
    expect(fetched.primaryEmail).toBe(created.primaryEmail);
    expect(fetched.phone).toBe(created.phone);
    expect(fetched.alcoholLicenseNumber).toBe(created.alcoholLicenseNumber);

    console.log("All fields validated successfully");
  });
});
