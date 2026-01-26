import { test, expect } from "@playwright/test";
import path from "path";
import data from "../../data/api-data/test-data.json";
import apiPaths from "../../data/api-data/api-path.json";
import { createBaselineWithRetry } from "../../custom_modules/api/aws-utils/aws-create-update-baseline-helper";
import {
getValidPaymentDetailsPayload,
missingPaymentTermsPayload,
missingPaymentCreditLimitPayload
} from "../../custom_modules/api/payload/update-payment-terms-payload";
import { runUpdateFlow } from "../../custom_modules/api/aws-utils/aws-update-flow-helper";
const baselineFilePath = path.join(
  process.cwd(),
  "src/data/update-baseline/payment-terms.json"
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

test.describe("Verify Edit Payment Terms API", () => {
  let globalID: string;
  let licenceNumber: string;

  test.beforeAll(async ({ request }) => {
    // This will create a new baseline customer and return globalID and licenceNumber
    const baselineResult = await createBaselineWithRetry(
      request,
      baselineFilePath,
      3
    );
    if (baselineResult) {
      globalID = baselineResult.globalID;
      licenceNumber = baselineResult.licenceNumber;
    } else {
      globalID = data.globalIDQA;
      licenceNumber = "";
    }
    if (!globalID || globalID === "NA") {
      globalID = data.globalIDQA;
    }
    // globalID = data.globalIDQA;
    expect(globalID).toBeTruthy();
  });

  test("TC-PAY-01 | Verify edit payment details with valid details", async ({
    request,
  }) => {
    const payload = getValidPaymentDetailsPayload();
    const response = await request.patch(
      `${baseUrl}${apiPaths["update-customer-account-details"]}/${globalID}?action=paymentDetails`,
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
        updateResult.updatedCustomer?.body.data.customer.paymentTerms,
        null,
        2
      )
    );
    console.log(JSON.stringify(payload.paymentDetails, null, 2));
    expect(
      updateResult.updatedCustomer?.body.data.customer.paymentTerms.term
    ).toBe(payload.paymentDetails.terms);
    expect(
      updateResult.updatedCustomer?.body.data.customer.paymentTerms.cadence
    ).toBe(payload.paymentDetails.cadence);
    expect(
      updateResult.updatedCustomer?.body.data.customer.paymentTerms.creditLimit
    ).toBe(payload.paymentDetails.creditLimit);
  });
  test("TC-PAY-02 | Verify edit payment details with missing payment terms", async ({
    request,
  }) => {
    const payload = missingPaymentTermsPayload();

    const response = await request.patch(
      `${baseUrl}${apiPaths["update-customer-account-details"]}/${globalID}?action=paymentDetails`,
      { data: payload, headers: authHeaders() }
    );

   expect(response.status()).toBe(500);
    const errorBody = await response.json();
    expect(errorBody.error).toBe("Missing fields for paymentDetails: terms");
  });

  test("TC-PAY-03 | Verify edit payment details with missing credit limit", async ({
    request,
  }) => {
    const payload = missingPaymentCreditLimitPayload();

    const response = await request.patch(
      `${baseUrl}${apiPaths["update-customer-account-details"]}/${globalID}?action=paymentDetails`,
      { data: payload, headers: authHeaders() }
    );

   expect(response.status()).toBe(500);
    const errorBody = await response.json();
    expect(errorBody.error).toBe("Missing fields for paymentDetails: creditLimit");
  });
});
