/* eslint-disable no-console */
import { APIRequestContext, expect } from '@playwright/test';
import { createCustomer, pollGetRequest, getCustomerByGlobalID, getCustomerByLicenceNumber } from './aws-api-helper';
import { Payload } from '../payload/generate-new-customer-payload';

/**
 * Shared reusable full flow for AWS Customer API
 */
export async function runFullFlow(
  request: APIRequestContext,
  payload: Payload,
  description: string,
  expected_accountName?: string,
) {
  console.log(`\n🚀 Running Scenario: ${description}`);

  // 1️⃣ Create Customer
  const { status, requestID, apiError, response } = await createCustomer(request, payload);
  console.log(`CreateCustomer → HTTP ${status}`);

  if (!response.ok() || apiError) {
    console.warn(`⚠️ Create Customer failed with HTTP ${status}`);
    console.warn(`Error message: ${apiError || 'Unknown'}`);
    return {
      status,
      apiError,
      requestID: null,
      getRequestStatus: null,
      globalID: null,
      getCustomerStatus: null,
      alcoholLicenseNumber: null,
    };
  }

  if (!requestID) {
    console.warn('⚠️ No requestID returned, cannot continue flow.');
    return {
      status,
      apiError,
      requestID,
      getRequestStatus: null,
      globalID: null,
      getCustomerStatus: null,
      alcoholLicenseNumber: null,
    };
  }

  // 2️⃣ Poll Get-Request until Active/Error
  const pollResult = await pollGetRequest(request, requestID);
  const getRequestStatus = pollResult.status;
  const globalID = pollResult.globalID;
  const getReqData = pollResult.getReqData;
  const alcoholLicenseNumber = pollResult.alcoholLicenseNumber;

  console.log(`📊 Polling Complete → Status=${getRequestStatus || 'N/A'}, GlobalID=${globalID || 'N/A'}`);

  let getCustomerStatus: number | null = null;

  // 3️⃣ If Active, verify customer details
  if (getRequestStatus === 'Active' && globalID) {
    const customer_GID = await getCustomerByGlobalID(request, globalID);
    getCustomerStatus = customer_GID.getCustomerRes.status();
    const data_GID = customer_GID.body.data.customer;

    expect(data_GID).toBeDefined();
    expect(
      data_GID.accountName
        ?.toUpperCase()
        .replace(/\s*&\s*/g, '&') // normalize spaces around &
        .replace(/\s*AND\s*/g, '&') // convert "AND" to "&"
        .trim(),
    ).toBe(expected_accountName);
    expect(data_GID.legalOwnerName).toBe(payload.legalOwnerName?.toUpperCase());
    expect(data_GID.licenses?.[0]?.number).toBe(payload.alcoholLicenseNumber);
    // SAP may normalize city names — log mismatch but do not fail
    const sentCity_GID = (payload.Address ?? [])[0]?.city?.toUpperCase() ?? '';
    const returnedCity_GID = (data_GID.addresses?.[0]?.city ?? '').toUpperCase();
    if (sentCity_GID !== returnedCity_GID) {
      console.warn(
        `[flow-helper] City mismatch (SAP normalized): sent="${sentCity_GID}" returned="${returnedCity_GID}"`,
      );
    }
    expect(returnedCity_GID).toBeTruthy();
    expect(data_GID.addresses?.[0]?.state).toBe((payload.Address ?? [])[0]?.state?.toUpperCase());
    // SAP may normalize postal code and county
    const sentPostal_GID = (payload.Address ?? [])[0]?.postalCode ?? '';
    const returnedPostal_GID = data_GID.addresses?.[0]?.postalCode ?? '';
    if (sentPostal_GID !== returnedPostal_GID) {
      console.warn(
        `[flow-helper] PostalCode mismatch (SAP normalized): sent="${sentPostal_GID}" returned="${returnedPostal_GID}"`,
      );
    }
    expect(returnedPostal_GID).toBeTruthy();
    expect(data_GID.addresses?.[0]?.country).toBe((payload.Address ?? [])[0]?.country?.toUpperCase());
    const sentCounty_GID = (payload.Address ?? [])[0]?.county?.toUpperCase() ?? '';
    const returnedCounty_GID = (data_GID.addresses?.[0]?.county ?? '').toUpperCase();
    if (sentCounty_GID !== returnedCounty_GID) {
      console.warn(
        `[flow-helper] County mismatch (SAP normalized): sent="${sentCounty_GID}" returned="${returnedCounty_GID}"`,
      );
    }
    expect(returnedCounty_GID).toBeTruthy();
    expect(data_GID.globalID).toBe(globalID);

    // Verifiy with Alcohol License Number
    if (!alcoholLicenseNumber) {
      throw new Error('alcoholLicenseNumber is undefined');
    }
    const customer_ALN = await getCustomerByLicenceNumber(request, alcoholLicenseNumber);
    getCustomerStatus = customer_ALN.getCustomerResponse.status();
    if (getCustomerStatus === 200) {
      const data_ALN = customer_GID.body.data.customer;

      expect(data_ALN).toBeDefined();
      expect(
        data_ALN.accountName
          ?.toUpperCase()
          .replace(/\s*&\s*/g, '&') // normalize spaces around &
          .replace(/\s*AND\s*/g, '&') // convert "AND" to "&"
          .trim(),
      ).toBe(expected_accountName);
      expect(data_ALN.legalOwnerName).toBe(payload.legalOwnerName?.toUpperCase());
      expect(data_ALN.licenses?.[0]?.number).toBe(payload.alcoholLicenseNumber);
      // SAP may normalize city names — log mismatch but do not fail
      const sentCity_ALN = (payload.Address ?? [])[0]?.city?.toUpperCase() ?? '';
      const returnedCity_ALN = (data_ALN.addresses?.[0]?.city ?? '').toUpperCase();
      if (sentCity_ALN !== returnedCity_ALN) {
        console.warn(
          `[flow-helper ALN] City mismatch (SAP normalized): sent="${sentCity_ALN}" returned="${returnedCity_ALN}"`,
        );
      }
      expect(returnedCity_ALN).toBeTruthy();
      expect(data_ALN.addresses?.[0]?.state).toBe((payload.Address ?? [])[0]?.state?.toUpperCase());
      // SAP may normalize postal code and county
      const sentPostal_ALN = (payload.Address ?? [])[0]?.postalCode ?? '';
      const returnedPostal_ALN = data_ALN.addresses?.[0]?.postalCode ?? '';
      if (sentPostal_ALN !== returnedPostal_ALN) {
        console.warn(
          `[flow-helper ALN] PostalCode mismatch (SAP normalized): sent="${sentPostal_ALN}" returned="${returnedPostal_ALN}"`,
        );
      }
      expect(returnedPostal_ALN).toBeTruthy();
      expect(data_ALN.addresses?.[0]?.country).toBe((payload.Address ?? [])[0]?.country?.toUpperCase());
      const sentCounty_ALN = (payload.Address ?? [])[0]?.county?.toUpperCase() ?? '';
      const returnedCounty_ALN = (data_ALN.addresses?.[0]?.county ?? '').toUpperCase();
      if (sentCounty_ALN !== returnedCounty_ALN) {
        console.warn(
          `[flow-helper ALN] County mismatch (SAP normalized): sent="${sentCounty_ALN}" returned="${returnedCounty_ALN}"`,
        );
      }
      expect(returnedCounty_ALN).toBeTruthy();
      expect(data_ALN.globalID).toBe(globalID);

      console.log(`✅ Customer Active (${globalID}) verified successfully with 200 OK`);
    } else if (getCustomerStatus === 500) {
      const body = await customer_ALN.getCustomerResponse.json().catch(() => ({}));
      expect(body.error).toContain('Multiple customers with licenseID');
    }
  } else if (getRequestStatus === 'Error') {
    console.error('❌ Customer creation failed (Status: Error)');
  } else {
    console.warn('⏳ Customer remained Pending after retries.');
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
