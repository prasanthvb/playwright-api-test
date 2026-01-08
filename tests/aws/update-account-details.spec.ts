import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { generatePayloadWithFakerData } from "../../utils/payload/generate-new-customer-payload";
import { runFullFlow } from "../../utils/aws-utils/aws-flow-helper";
import { pollGetRequest } from "../../utils/aws-utils/aws-api-helper";
import { getCustomerByGlobalID } from "../../utils/aws-utils/aws-api-helper";
import apiPaths from "../../fixtures/api-path.json";
import { createBaselineWithRetry } from "../../utils/aws-utils/aws-create-update-baseline-helper";
import {
  getValidAccountDetailsPayload,
  getInvalidEmailPayload,
  getInvalidPhonePayload,
} from "../../utils/payload/update-account-details-payload";
import { runUpdateFlow } from "../../utils/aws-utils/aws-update-flow-helper";
const baselineFilePath = path.join(
  process.cwd(),
  'fixtures/update-baseline/account-details.json'
);

test.describe('Update Account Details API', () => {
  let globalID: string;

  test.beforeAll(async ({ request }) => {
    globalID = await createBaselineWithRetry(
      request,
      baselineFilePath,
      3
    );

    expect(globalID).toBeTruthy();
  });

  test('TC-ACC-01 | Update account details with valid data', async ({ request }) => {
    const payload = getValidAccountDetailsPayload();

    const response = await request.patch(
      `${apiPaths['update-customer-account-details']}/${globalID}?action=accountDetails`,
      { data: payload }
    );

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.updateRequestID).toBeTruthy();

    const updateResult = await runUpdateFlow(
      request,
      body,
      globalID
    );

    expect(updateResult.status).toBe('active');

    expect(updateResult.updatedCustomer?.body.data.customer.contactFirstName)
      .toBe(payload.accountDetails.contactFirstName);
    expect(updateResult.updatedCustomer?.body.data.customer.contactLastName)
      .toBe(payload.accountDetails.contactLastName);
    expect(updateResult.updatedCustomer?.body.data.customer.primaryEmail)
      .toBe(payload.accountDetails.primaryEmail);
    expect(updateResult.updatedCustomer?.body.data.customer.phone)
      .toBe(payload.accountDetails.phone);
  });

  test('TC-ACC-02 | Invalid email format', async ({ request }) => {
    const response = await request.patch(
       `${apiPaths['update-customer-account-details']}/${globalID}?action=accountDetails`,
      { data: getInvalidEmailPayload() }
    );

    expect(response.status()).toBe(400);
  });

  test('TC-ACC-03 | Invalid phone format', async ({ request }) => {
    const response = await request.patch(
       `${apiPaths['update-customer-account-details']}/${globalID}?action=accountDetails`,
      { data: getInvalidPhonePayload() }
    );

    expect(response.status()).toBe(400);
  });

  test('TC-ACC-04 | Missing accountDetails object', async ({ request }) => {
    const response = await request.patch(
       `${apiPaths['update-customer-account-details']}/${globalID}?action=accountDetails`,
      { data: {} }
    );

    expect(response.status()).toBe(400);
  });

  test('TC-ACC-05 | Unauthorized request', async ({ request, playwright }) => {
    const context = await playwright.request.newContext({ extraHTTPHeaders: {} });

    const response = await context.patch(
       `${apiPaths['update-customer-account-details']}/${globalID}?action=accountDetails`,
      { data: getValidAccountDetailsPayload() }
    );

    expect(response.status()).toBe(401);

    await context.dispose();
  });

  test('TC-ACC-06 | Invalid globalID', async ({ request }) => {
    const response = await request.patch(
       `${apiPaths['update-customer-account-details']}/9999999999?action=accountDetails`,
      { data: getValidAccountDetailsPayload() }
    );

    expect(response.status()).toBe(404);
  });
});
