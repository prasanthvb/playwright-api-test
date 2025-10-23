import { test, expect, request } from "@playwright/test";
import { generatePayloadWithFakerData } from "../../utils/payload/generate-new-customer-payload";
import { runFullFlow } from "../../utils/aws-utils/aws-flow-helper";
import expectedErrors from "../../fixtures/aws-error-messages.json";
import data from "../../fixtures/test-data.json";
import { awsConfig } from "../../config/api-config";
import apiPaths from "../../fixtures/api-path.json";

const baseUrl = awsConfig.baseUrl;

test.describe("AWS Create Customer - Get Request - Get Customer - API Test Cases Validation", () => {
  test("CC-01 Create customer with valid details", async ({ request }) => {
    const payload = await generatePayloadWithFakerData();

    const result = await runFullFlow(
      request,
      payload,
      "Create customer with valid details"
    );
    expect(result).toBeDefined();
    expect(result.status).toBe(200);

    if (result.requestID) {
      expect(result.getRequestStatus).toBeDefined();
      expect(result.getRequestStatus).toContain(["Active"]);

      if (result.getRequestStatus === "Active") {
        expect(result.globalID).toBeTruthy();
        expect(result.getCustomerStatus).toBe(200);
      }
    }
  });

  test("CC-02 Missing required field (accountName)", async ({ request }) => {
    const payload = await generatePayloadWithFakerData();
    payload.accountName = "";
    const result = await runFullFlow(request, payload, "Missing Account Name");
    expect(result).toBeDefined();
    expect(result.status).toBe(500);
    expect(result.apiError).toContain(expectedErrors["CC-02"]);
  });

  test("CC-03 Invalid email format", async ({ request }) => {
    const payload = await generatePayloadWithFakerData();
    payload.primaryEmail = "email@example.com (Joe Smith)";

    const result = await runFullFlow(request, payload, "Invalid Email Format");
    expect(result).toBeDefined();
    expect(result.status).toBe(200);

    expect(result.requestID).toBeTruthy();
    expect(result.getRequestStatus).toBeDefined();
    expect(result.getRequestStatus).toContain(["Error"]);
  });

  test("CC-04 Invalid phone number", async ({ request }) => {
    const payload = await generatePayloadWithFakerData();
    payload.phone = "ABC-123";

    const result = await runFullFlow(request, payload, "Invalid Phone Number");
    expect(result).toBeDefined();
    expect(result.status).toBe(200);

    expect(result.requestID).toBeTruthy();
    expect(result.getRequestStatus).toBeDefined();
    expect(result.getRequestStatus).toContain(["Error"]);
  });

  test("CC-05 Duplicate license number", async ({ request }) => {
    const payload = await generatePayloadWithFakerData();
    payload.alcoholLicenseNumber = data.alcoholLicenseNumber;

    const result = await runFullFlow(
      request,
      payload,
      "Duplicate License Number"
    );
    expect(result).toBeDefined();
    expect(result.status).toBe(200);

    if (result.requestID) {
      expect(result.getRequestStatus).toBeDefined();
      expect(result.getRequestStatus).toContain(["Active"]);

      if (result.getRequestStatus === "Active") {
        expect(result.globalID).toBeTruthy();
        expect(result.getCustomerStatus).toBe(200);
      }
    }
  });

  test("CC-06 Liquor License >40 chars", async ({ request }) => {
    const payload = await generatePayloadWithFakerData();
    payload.alcoholLicenseNumber = "L".repeat(41);

    const result = await runFullFlow(
      request,
      payload,
      "Liquor License >40 characters"
    );
    expect(result).toBeDefined();
    expect(result.status).toBe(200);

    expect(result.requestID).toBeTruthy();
    expect(result.getRequestStatus).toBeDefined();
    expect(result.getRequestStatus).toContain(["Error"]);
  });

  test("CC-07 Legal Owner Name >100 chars", async ({ request }) => {
    const payload = await generatePayloadWithFakerData();
    payload.legalOwnerName = "L".repeat(101);

    const result = await runFullFlow(
      request,
      payload,
      "Legal Owner Name >100 characters"
    );
    expect(result).toBeDefined();
    expect(result.status).toBe(200);

    expect(result.requestID).toBeTruthy();
    expect(result.getRequestStatus).toBeDefined();
    expect(result.getRequestStatus).toContain(["Error"]);
  });

  test("CC-08 Account Name >100 chars", async ({ request }) => {
    const payload = await generatePayloadWithFakerData();
    payload.accountName = "L".repeat(101);

    const result = await runFullFlow(
      request,
      payload,
      "Account Name >100 characters"
    );
    expect(result).toBeDefined();
    expect(result.status).toBe(200);

    expect(result.requestID).toBeTruthy();
    expect(result.getRequestStatus).toBeDefined();
    expect(result.getRequestStatus).toContain(["Error"]);
  });

  test("CC-09 Street Address > 100 chars", async ({ request }) => {
    const payload = await generatePayloadWithFakerData();
    payload.Address[0].addressLine1 = "L".repeat(101);

    const result = await runFullFlow(
      request,
      payload,
      "Street Address > 100 characters"
    );
    expect(result).toBeDefined();
    expect(result.status).toBe(200);

    expect(result.requestID).toBeTruthy();
    expect(result.getRequestStatus).toBeDefined();
    expect(result.getRequestStatus).toContain(["Error"]);
  });

  test("CC-10 City > 40 chars", async ({ request }) => {
    const payload = await generatePayloadWithFakerData();
    payload.Address[0].city = "L".repeat(41);

    const result = await runFullFlow(request, payload, "City > 40 characters");
    expect(result).toBeDefined();
    expect(result.status).toBe(200);

    expect(result.requestID).toBeTruthy();
    expect(result.getRequestStatus).toBeDefined();
    expect(result.getRequestStatus).toContain(["Error"]);
  });

  test("CC-11 County > 40 chars", async ({ request }) => {
    const payload = await generatePayloadWithFakerData();
    payload.Address[0].county = "L".repeat(41);

    const result = await runFullFlow(
      request,
      payload,
      "County > 40 characters"
    );
    expect(result).toBeDefined();
    expect(result.status).toBe(200);

    expect(result.requestID).toBeTruthy();
    expect(result.getRequestStatus).toBeDefined();
    expect(result.getRequestStatus).toContain(["Error"]);
  });

  test("CC-12 Invalid State input", async ({ request }) => {
    const payload = await generatePayloadWithFakerData();
    payload.Address[0].state = data.invalidState;

    const result = await runFullFlow(request, payload, "Invalid State Input");
    expect(result).toBeDefined();
    expect(result.status).toBe(200);

    expect(result.requestID).toBeTruthy();
    expect(result.getRequestStatus).toBeDefined();
    expect(result.getRequestStatus).toContain(["Error"]);
  });

  test("CC-14 State > 50 chars", async ({ request }) => {
    const payload = await generatePayloadWithFakerData();
    payload.Address[0].state = "L".repeat(51);

    const result = await runFullFlow(request, payload, "State > 50 characters");
    expect(result).toBeDefined();
    expect(result.status).toBe(200);

    expect(result.requestID).toBeTruthy();
    expect(result.getRequestStatus).toBeDefined();
    expect(result.getRequestStatus).toContain(["Error"]);
  });

  test("CC-15 Postal code < 5 chars", async ({ request }) => {
    const payload = await generatePayloadWithFakerData();
    payload.Address[0].postalCode = "2".repeat(4);

    const result = await runFullFlow(
      request,
      payload,
      "Postal code < 5 characters"
    );
    expect(result).toBeDefined();
    expect(result.status).toBe(200);

    expect(result.requestID).toBeTruthy();
    expect(result.getRequestStatus).toBeDefined();
    expect(result.getRequestStatus).toContain(["Error"]);
  });

  test("CC-16 First Name > 40 chars", async ({ request }) => {
    const payload = await generatePayloadWithFakerData();
    payload.contactFirstName = "L".repeat(41);

    const result = await runFullFlow(
      request,
      payload,
      "Last Name > 41 characters"
    );
    expect(result).toBeDefined();
    expect(result.status).toBe(200);

    expect(result.requestID).toBeTruthy();
    expect(result.getRequestStatus).toBeDefined();
    expect(result.getRequestStatus).toContain(["Error"]);
  });

  test("CC-17 Last Name > 40 chars", async ({ request }) => {
    const payload = await generatePayloadWithFakerData();
    payload.contactLastName = "L".repeat(41);

    const result = await runFullFlow(
      request,
      payload,
      "Last Name > 41 characters"
    );
    expect(result).toBeDefined();
    expect(result.status).toBe(200);

    expect(result.requestID).toBeTruthy();
    expect(result.getRequestStatus).toBeDefined();
    expect(result.getRequestStatus).toContain(["Error"]);
  });

  test("CC-18 On Premise valid", async ({ request }) => {
    const payload = await generatePayloadWithFakerData();
    payload.distributionChannel = { Code: "10", Name: "On Premise" };

    const result = await runFullFlow(request, payload, "On Premise Valid Flow");
    expect(result.status).toBe(200);

    if (result.requestID) {
      expect(result.getRequestStatus).toBeDefined();
      expect(result.getRequestStatus).toContain(["Active"]);

      if (result.getRequestStatus === "Active") {
        expect(result.globalID).toBeTruthy();
        expect(result.getCustomerStatus).toBe(200);
      }
    }
  });

  test("CC-19 Off Premise valid", async ({ request }) => {
    const payload = await generatePayloadWithFakerData();
    payload.distributionChannel = { Code: "20", Name: "Off Premise" };

    const result = await runFullFlow(
      request,
      payload,
      "Off Premise Valid Flow"
    );
    expect(result.status).toBe(200);

    if (result.requestID) {
      expect(result.getRequestStatus).toBeDefined();
      expect(result.getRequestStatus).toContain(["Active"]);

      if (result.getRequestStatus === "Active") {
        expect(result.globalID).toBeTruthy();
        expect(result.getCustomerStatus).toBe(200);
      }
    }
  });

  test("CC-20 On/Off Premise - missing selection", async ({ request }) => {
    const payload = await generatePayloadWithFakerData();
    payload.distributionChannel = null;
    const result = await runFullFlow(
      request,
      payload,
      "On/Off Premise - missing selection"
    );
    expect(result).toBeDefined();
    expect(result.status).toBe(200);

    expect(result.requestID).toBeTruthy();
    expect(result.getRequestStatus).toBeDefined();
    expect(result.getRequestStatus).toContain(["Error"]);
  });

  test("CC-21 Unauthorized Request", async ({ request }) => {
    const payload = await generatePayloadWithFakerData();
    const res = await request.post(
      `${baseUrl}${apiPaths["aws-create-customer"]}`,
      {
        headers: {
          "Content-Type": "application/json",
          "x-api-key": "INVALID_KEY",
        },
        data: payload,
      }
    );

    console.log("Unauthorized Response:", await res.text());
    expect([401, 403]).toContain(res.status());
  });

  test("CC-22 Verify duplicate customer error", async ({ request }) => {
    const payload = await generatePayloadWithFakerData();
    let globalID: string | undefined;
    const result = await runFullFlow(
      request,
      payload,
      "Create customer with valid details"
    );
    expect(result).toBeDefined();
    expect(result.status).toBe(200);

    if (result.requestID) {
      expect(result.getRequestStatus).toBeDefined();
      expect(result.getRequestStatus).toContain(["Active"]);

      if (result.getRequestStatus === "Active") {
        expect(result.globalID).toBeTruthy();
        globalID = result.globalID;
        expect(result.getCustomerStatus).toBe(200);

        // Attempt to create the same customer again
        const duplicateResult = await runFullFlow(
          request,
          payload,
          "Duplicate Customer Creation"
        );
        expect(duplicateResult).toBeDefined();
        expect(duplicateResult.status).toBe(200);

        expect(duplicateResult.requestID).toBeTruthy();
        expect(duplicateResult.getRequestStatus).toBeDefined();
        expect(duplicateResult.getRequestStatus).toContain(["Error"]);
        const errors = duplicateResult.getReqData?.error;
        expect(errors).toBeDefined();
        expect(Array.isArray(errors)).toBeTruthy();
        expect(errors.length).toBeGreaterThan(0);

        // Validate each error object structure
        for (const err of errors) {
          expect(err).toHaveProperty("message");
          expect(err).toHaveProperty("errorCode");

          // Check that known duplicate messages/codes appear
          if (err.errorCode === "sf-duplicate") {
            expect(err.message).toContain("duplicate value found");
          }
          if (err.errorCode === "s4-duplicate") {
            expect(err.message).toContain("already exists");
          }
        }

        // At least one duplicate-related error must exist
        const duplicateCodes = errors.map((e: any) => e.errorCode);
        expect(duplicateCodes).toEqual(
          expect.arrayContaining(["sf-duplicate", "s4-duplicate"])
        );
      }
    }
  });
});
