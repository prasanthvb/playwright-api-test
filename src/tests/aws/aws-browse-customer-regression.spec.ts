import { test, expect, request } from "@playwright/test";
import { generateBrowseCustomerPayload } from "../../custom_modules/api/payload/generate-browse-customer-payloads";
import { browseCustomers } from "../../custom_modules/api/aws-utils/aws-api-helper";
import { awsConfig } from "../../../config/api-config";
import expectedErrors from "../../data/api-data/aws-error-messages.json";
import data from "../../data/api-data/test-data.json";
import apiPaths from "../../data/api-data/api-path.json";
const baseUrl = awsConfig.baseUrl;

test.describe('AWS Browse Customers API - Validation Flow', () => {
  test('BC-01 Browse with valid state only', async ({ request }) => {
    const payload = generateBrowseCustomerPayload('validStateOnly');
    const { response, body } = await browseCustomers(request, payload);
    expect(response.status()).toBe(200);
    expect(Array.isArray(body.records)).toBeTruthy();
    if (body.records?.length > 0)
      expect(body.records[0].Address[0].state).toBe(data.validState1);
  });

  test('BC-02 Browse with valid state + accountName filter', async ({ request }) => {
    const payload = generateBrowseCustomerPayload('validStateWithAccountName');
    const { response, body } = await browseCustomers(request, payload);
    expect(response.status()).toBe(200);
    expect(body.records?.length || 0).toBe(0);
  });

  test('BC-03 Browse with valid state + alcoholLicenseNumber filter', async ({ request }) => {
    const payload = generateBrowseCustomerPayload('validStateWithLicense');
    const { response, body } = await browseCustomers(request, payload);
    expect(response.status()).toBe(200);
    if (body.records?.length > 0)
      expect(body.records[0].alcoholLicenseNumber).toBe('BQ1116872');
  });

  test('BC-04 Browse with valid state + non-matching filter', async ({ request }) => {
    const payload = generateBrowseCustomerPayload('validStateWithNonMatchingFilter');
    const { response, body } = await browseCustomers(request, payload);
    expect(response.status()).toBe(200);
    expect(body.records?.length || 0).toBe(0);
  });

  test('BC-05 Browse with valid state + unsupported filter', async ({ request }) => {
    const payload = generateBrowseCustomerPayload('validStateWithUnsupportedFilter');
    const { response, body } = await browseCustomers(request, payload);
    expect(response.status()).toBe(200);
    expect(body.records?.length || 0).toBe(0);
  });

  test('BC-06 Browse with invalid state', async ({ request }) => {
    const payload = generateBrowseCustomerPayload('invalidState');
    const { response, body } = await browseCustomers(request, payload);
    expect(response.status()).toBe(200);
    expect(body.records?.length || 0).toBe(0);
  });

  test('BC-07 Browse with missing state field', async ({ request }) => {
    const payload = generateBrowseCustomerPayload('missingState');
    const { response, body } = await browseCustomers(request, payload);
    expect([400, 500]).toContain(response.status());
    expect(body.message).toBe("Error");
    expect(body.error).toContain(expectedErrors["BC-07"]);
  });

  test('BC-08 Unauthorized request', async ({ request }) => {
    const payload = generateBrowseCustomerPayload('unauthorized');
     const res = await request.get(
      `${baseUrl}${apiPaths['aws-browse-customer']}`,
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
});