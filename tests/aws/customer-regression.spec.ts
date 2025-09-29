import * as dotenv from 'dotenv';

dotenv.config();
import { test, expect } from "@playwright/test";
import apiPaths from "../../fixtures/api-path.json";
import { generatePayloadWithFakerData } from "../../utils/payload/generate-new-customer-payload";

const baseUrl =
  process.env.AWS_SANDBOX_URL ||
  "https://cvx1f3z70f.execute-api.us-east-1.amazonaws.com/sandbox";
const apiKey = process.env.AWS_API_KEY || "";
console.log("API Key:", apiKey);
// Helper to add API key header
function authHeaders() {
  return {
    "Content-Type": "application/json",
    "x-api-key": apiKey,
  };
}

test.describe("AWS Customer API - Regression Flow", () => {
  let requestId: string;
  let alcoholLicenseNumber: string;

  test("🚀 End-to-End Regression Flow", async ({ request }) => {
    // 1️⃣ Create Customer
    const payload = generatePayloadWithFakerData();
    console.log("Create Payload:", payload);
    alcoholLicenseNumber = payload.alcoholLicenseNumber;
    const createCustomerURL = `${baseUrl}${apiPaths["aws-create-customer"]}`;
    console.log("Create Customer URL:", createCustomerURL);
    const createRes = await request.post(createCustomerURL, {
      headers: authHeaders(),
      data: payload,
      timeout: 5000, // 5 seconds timeout
    });
    let data: any;
    const contentType = createRes.headers()["content-type"] || "";
    if (contentType.includes("application/json")) {
      data = await createRes.json();
    } else {
      data = await createRes.text();
    }
    console.log("Positive Test createRes:", data);
    expect(createRes.ok()).toBeTruthy();
    expect(createRes.status()).toBe(200);
    const createData = await createRes.json();
    console.log("Create Response:", createData);

    requestId = createData?.requestID;
    expect(requestId).toBeDefined();

    // 2️⃣ Poll Get-Request until status changes
    let status = "Pending";
    let attempts = 0;
    while (status === "Pending" && attempts < 10) {
      const getRes = await request.get(
        `${baseUrl}${apiPaths["aws-get-request"]}`,
        {
          headers: authHeaders(),
          data: { requestID: requestId },
        }
      );
      const getData = await getRes.json();
      status = getData?.status;
      console.log(`Attempt ${attempts + 1}: Status = ${status}`);
      if (status === "Pending") {
        await new Promise((r) => setTimeout(r, 5000)); // wait 5s before retry
      }
      attempts++;
    }

    if (status === "Active") {
      console.log("✅ Customer successfully created in C360 and S4");
    } else if (status === "Error") {
      console.error("❌ Error in creating customer");
    } else {
      console.warn("⚠️ Status did not resolve after polling");
    }

    expect(["Active", "Error"]).toContain(status);

    // 3️⃣ Get-Customer using alcoholLicenseNumber
    const getCustRes = await request.get(
      `${baseUrl}${apiPaths["aws-get-customer"]}`,
      {
        headers: authHeaders(),
        data: { alcoholLicenseNumber },
      }
    );
    expect(getCustRes.ok()).toBeTruthy();
    const getCustData = await getCustRes.json();
    console.log("Get-Customer Response:", getCustData);

    expect(getCustData?.alcoholLicenseNumber).toBe(alcoholLicenseNumber);

    // 4️⃣ Browse Customers
    const browseRes = await request.get(
      `${baseUrl}${apiPaths["aws-browser-customer"]}`,
      {
        headers: authHeaders(),
        data: {
          sortToken: "time",
          sortDirection: "desc",
          pageSize: 2,
          nextToken: "",
          filter: "",
          filterValue: "",
        },
      }
    );
    expect(browseRes.ok()).toBeTruthy();
    const browseData = await browseRes.json();
    console.log("Browse-Customer Response:", browseData);

    expect(Array.isArray(browseData?.customers || [])).toBeTruthy();
  });
});
