import { test, expect } from '@playwright/test';
import apiPaths from '../../data/api-data/api-path.json';
import {
  getValidSupportCasePayload,
  getMissingMessagePayload,
  getInvalidShippingStatePayload,
  getMalformedEmailPayload,
} from '../../custom_modules/api/payload/generate-support-case-payload';
import { awsConfig, getAuthHeaders } from '../../../config/api-config';

const baseUrl = awsConfig.baseUrl;

// CUSTOMER-128 | Verify Salesforce Support Case Creation API
//
// This suite targets the confirmed real contract of POST /case-creation, verified directly
// against Dev (curl + Postman probing, cross-checked with the developer's own examples) -
// not the original ticket text, which the developer has been asked to correct. Confirmed
// contract: required fields are message/firstName/lastName/email/shippingState (not
// "subject"), phone is optional, success is HTTP 200 with { caseID, caseNumber } (not 201 /
// caseId), and Salesforce-side rejections surface as HTTP 400 (not 500) with the real
// Salesforce error message.
test.describe('CUSTOMER-128 | Verify Salesforce Support Case Creation API', () => {
  test('TC-SC-01 | Valid body returns 200 with caseID and caseNumber', async ({ request }) => {
    const payload = getValidSupportCasePayload();
    const response = await request.post(`${baseUrl}${apiPaths['create-support-case']}`, {
      data: payload,
      headers: getAuthHeaders(),
    });

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.caseID).toBeTruthy();
    expect(body.caseNumber).toBeTruthy();
  });

  test('TC-SC-02 | Missing message returns 400', async ({ request }) => {
    const payload = getMissingMessagePayload();
    const response = await request.post(`${baseUrl}${apiPaths['create-support-case']}`, {
      data: payload,
      headers: getAuthHeaders(),
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.message).toContain('Missing required fields');
  });

  test('TC-SC-03 | Invalid shippingState returns 400', async ({ request }) => {
    const payload = getInvalidShippingStatePayload();
    const response = await request.post(`${baseUrl}${apiPaths['create-support-case']}`, {
      data: payload,
      headers: getAuthHeaders(),
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.message).toContain('Invalid shippingState');
  });

  // Not verifiable through this API alone - the response only returns { caseID, caseNumber },
  // never the assembled message/Description, and this suite has no Salesforce read access to
  // fetch the created case back.
  test.skip('TC-SC-04 | Description is assembled with capitalized first/last name', async () => {});

  test('TC-SC-05 | Salesforce-side rejection (malformed email) returns 400', async ({ request }) => {
    const payload = getMalformedEmailPayload();
    const response = await request.post(`${baseUrl}${apiPaths['create-support-case']}`, {
      data: payload,
      headers: getAuthHeaders(),
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.message).toBe('Salesforce API returned errors.');
    expect(Array.isArray(body.errors)).toBeTruthy();
    expect(body.errors.some((e: { message: string }) => e.message.includes('invalid email address'))).toBeTruthy();
  });
});
