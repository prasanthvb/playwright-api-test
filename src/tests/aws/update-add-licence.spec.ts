import { test, expect } from "@playwright/test";
import path from "path";
import data from "../../data/api-data/test-data.json";
import apiPaths from "../../data/api-data/api-path.json";
import { createBaselineWithRetry } from "../../custom_modules/api/aws-utils/aws-create-update-baseline-helper";
import {
  addNewLicensePayload,
  getDuplicateLicensePayload,
  getInvalidLicenseTypePayload,
  getInvalidLicenseDatesPayload,
  getMissingLicenseNumberPayload,
  getMissingLicenseDatesPayload,
  getMissingLicenseTypePayload,
} from "../../custom_modules/api/payload/update-licence-payload";
import { runUpdateFlow } from "../../custom_modules/api/aws-utils/aws-update-flow-helper";
const baselineFilePath = path.join(
  process.cwd(),
  "src/data/update-baseline/edit-licence.json"
);

import { awsConfig } from "../../../config/api-config";

const baseUrl = awsConfig.baseUrl;
const apiKey = awsConfig.apiKey;

// Helper to add API key header
function authHeaders() {
  return {
    "x-api-key": apiKey ?? "",
  };
}

test.describe("Verify Add License API", () => {
  let globalID: string;

  test.beforeAll(async ({ request }) => {
    // This will create a new baseline customer and return globalID and licenceNumber
    const baselineResult = await createBaselineWithRetry(
      request,
      baselineFilePath,
      3
    );
    if (baselineResult) {
      globalID = baselineResult.globalID;
    } else {
      globalID = data.globalIDQA;
    }
    if (!globalID || globalID === "NA") {
      globalID = data.globalIDQA;
    }
    // globalID = data.globalIDQA;
    expect(globalID).toBeTruthy();
  });

  test("TC-LIC-09 | Verify add license with valid details", async ({
    request,
  }) => {
    const payload = addNewLicensePayload();
    const response = await request.patch(
      `${baseUrl}${apiPaths["update-customer-account-details"]}/${globalID}?action=license`,
      { data: payload, headers: authHeaders() }
    );

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.updateRequestID).toBeTruthy();
    console.log(body);

    const updateResult = await runUpdateFlow(request, body, globalID);

    expect(updateResult.status).toBe("active");
    console.log(
      JSON.stringify(
        updateResult.updatedCustomer?.body.data.customer.licenses,
        null,
        2
      )
    );
    console.log(JSON.stringify(payload.license, null, 2));
    // Find the license in the updated licenses array that matches the payload license number
    const updatedLicenses =
      updateResult.updatedCustomer?.body.data.customer.licenses || [];
    const matchedLicense = updatedLicenses.find(
      (license: any) => license.number === payload.license.number
    );

    expect(matchedLicense).toBeTruthy();
    expect(matchedLicense.effectiveDate).toBe(payload.license.effectiveDate);
    expect(matchedLicense.expirationDate).toBe(payload.license.expirationDate);
    // expect(matchedLicense.type).toBe(payload.license.type);
  });

  test("TC-LIC-10 | Verify add with duplicate license number", async ({
    request,
  }) => {
    const payload = getDuplicateLicensePayload();
    payload.license.operation = "add";
    const response = await request.patch(
      `${baseUrl}${apiPaths["update-customer-account-details"]}/${globalID}?action=license`,
      { data: payload, headers: authHeaders() }
    );

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.updateRequestID).toBeTruthy();
    console.log(body);

    const updateResult = await runUpdateFlow(request, body, globalID);

    expect(updateResult.status).toBe("active");
    console.log(
      JSON.stringify(
        updateResult.updatedCustomer?.body.data.customer.licenses,
        null,
        2
      )
    );
    console.log(JSON.stringify(payload.license, null, 2));
    // Find the license in the updated licenses array that matches the payload license number
    const updatedLicenses =
      updateResult.updatedCustomer?.body.data.customer.licenses || [];
    const matchedLicense = updatedLicenses.find(
      (license: any) => license.number === payload.license.number
    );

    expect(matchedLicense).toBeTruthy();
    expect(matchedLicense.effectiveDate).toBe(payload.license.effectiveDate);
    expect(matchedLicense.expirationDate).toBe(payload.license.expirationDate);
    // expect(matchedLicense.type).toBe(payload.license.type);
  });

  test("TC-LIC-11 | Verify add licence with Invalid license type", async ({
    request,
  }) => {
    const payload = getInvalidLicenseTypePayload();
    payload.license.operation = "add";
    const response = await request.patch(
      `${baseUrl}${apiPaths["update-customer-account-details"]}/${globalID}?action=license`,
      { data: payload, headers: authHeaders() }
    );

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.updateRequestID).toBeTruthy();
    console.log(body);

    const updateResult = await runUpdateFlow(request, body, globalID);
    // The invalid type validation is not enforced server-side, so status will be active
    expect(updateResult.status).toBe("active");
  });

  test("TC-LIC-12 | Verify add licence with Invalid effective date and expiration date", async ({
    request,
  }) => {
    const payload = getInvalidLicenseDatesPayload();
    payload.license.operation = "add";
    const response = await request.patch(
      `${baseUrl}${apiPaths["update-customer-account-details"]}/${globalID}?action=license`,
      { data: payload, headers: authHeaders() }
    );

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.updateRequestID).toBeTruthy();
    console.log(body);

    const updateResult = await runUpdateFlow(request, body, globalID);
    // The invalid dates validation is not enforced server-side, so status will be active
    expect(updateResult.status).toBe("active");
  });

  test("TC-LIC-13 | Verify add licence with missing license details object", async ({
    request,
  }) => {
    const payload = {}; // Empty payload
    const response = await request.patch(
      `${baseUrl}${apiPaths["update-customer-account-details"]}/${globalID}?action=license`,
      { data: payload, headers: authHeaders() }
    );

    expect(response.status()).toBe(500);
    const errorBody = await response.json();
    expect(errorBody.error).toBe(
      "Cannot read properties of undefined (reading 'length')"
    );
  });

  test("TC-LIC-14 | Verify add licence with missing license number", async ({
    request,
  }) => {
    const payload = getMissingLicenseNumberPayload();
    payload.license.operation = "add";
    const response = await request.patch(
      `${baseUrl}${apiPaths["update-customer-account-details"]}/${globalID}?action=license`,
      { data: payload, headers: authHeaders() }
    );

    expect(response.status()).toBe(500);

    const body = await response.json();
    expect(body.error).toBe("Missing fields for license: number");
  });

  test("TC-LIC-15 | Verify add licence with missing license effective date and expiration date", async ({
    request,
  }) => {
    const payload = getMissingLicenseDatesPayload();
    payload.license.operation = "add";
    const response = await request.patch(
      `${baseUrl}${apiPaths["update-customer-account-details"]}/${globalID}?action=license`,
      { data: payload, headers: authHeaders() }
    );

    expect(response.status()).toBe(500);

    const body = await response.json();
    expect(body.error).toBe(
      "Missing fields for license: effectiveDate, expirationDate"
    );
  });

  test("TC-LIC-16 | Verify add licence with missing license type", async ({
    request,
  }) => {
    const payload = getMissingLicenseTypePayload();
    payload.license.operation = "add";
    const response = await request.patch(
      `${baseUrl}${apiPaths["update-customer-account-details"]}/${globalID}?action=license`,
      { data: payload, headers: authHeaders() }
    );

    expect(response.status()).toBe(500);

    const body = await response.json();
    expect(body.error).toBe("Missing fields for license: type");
  });
});
