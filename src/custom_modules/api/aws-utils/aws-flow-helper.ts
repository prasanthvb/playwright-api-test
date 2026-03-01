/* eslint-disable no-console */
import { APIRequestContext, expect } from '@playwright/test';
import { createCustomer, pollGetRequest, getCustomerByGlobalID, getCustomerByLicenceNumber } from './aws-api-helper';
import { Payload } from '../payload/generate-new-customer-payload';
import licenseData from '../../../data/api-data/licenseType.json';

/**
 * Shared reusable full flow for AWS Customer API
 */
export async function runFullFlow(request: APIRequestContext, payload: Payload, description: string) {
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
      getCustomerAddress: null,
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
      customer_GID: null,
      getCustomerAddress: null,
    };
  }

  // 2️⃣ Poll Get-Request until Active/Error
  const pollResult = await pollGetRequest(request, requestID);
  const getRequestStatus = pollResult.status;
  const globalID = pollResult.globalID;
  const getReqData = pollResult.getReqData;
  const alcoholLicenseNumber = pollResult.alcoholLicenseNumber;

  console.log(
    `📊 Polling Complete → Status=${getRequestStatus || 'N/A'}, GlobalID=${
      globalID || 'N/A'
    }, RequestID=${requestID || 'N/A'},}`,
  );

  let getCustomerStatus: number | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let getCustomerAddress: Record<string, any> | null = null;

  // 3️⃣ If Active, verify customer details
  if (getRequestStatus === 'Active' && globalID) {
    const customer_GID = await getCustomerByGlobalID(request, globalID);
    getCustomerStatus = customer_GID.getCustomerRes.status();
    const data_GID = customer_GID.body.data.customer;
    getCustomerAddress = customer_GID.body.data.customer.addresses[0];

    expect(data_GID).toBeDefined();
    expect(
      data_GID.accountName
        ?.toUpperCase()
        .replace(/\s*&\s*/g, '&') // normalize spaces around &
        .replace(/\s*AND\s*/g, '&') // convert "AND" to "&"
        .trim(),
    ).toBe(
      payload.accountName
        ?.toUpperCase()
        .replace(/\s*&\s*/g, '&')
        .replace(/\s*AND\s*/g, '&')
        .trim(),
    );
    expect(data_GID.legalOwnerName).toBe(payload.legalOwnerName?.toUpperCase());
    expect(data_GID.licenses?.[0]?.number).toBe(payload.alcoholLicenseNumber);
    expect(data_GID.addresses?.[0]?.city).toBe(payload.Address?.[0]?.city?.toUpperCase());
    expect(data_GID.addresses?.[0]?.state).toBe(payload.Address?.[0]?.state?.toUpperCase());
    expect(data_GID.addresses?.[0]?.postalCode).toBe(payload.Address?.[0]?.postalCode);
    expect(data_GID.addresses?.[0]?.country).toBe(payload.Address?.[0]?.country?.toUpperCase());
    expect(data_GID.addresses?.[0]?.county).toBe(payload.Address?.[0]?.county?.toUpperCase());
    expect(data_GID.globalID).toBe(globalID);

    const state = payload.Address?.[0]?.state;
    const premise = payload.distributionChannel?.Name;
    const reqLicenseType = payload.licenseType;

    const validCombos = licenseData
      .filter(
        (item) => item.state === state && item.distributionChannel === premise && item.licenseType === reqLicenseType,
      )
      .map((item) => item.permitCombo);

    if (validCombos.length > 0) {
      expect(validCombos).toContain(data_GID.licenses?.[0]?.licenseType);
    }

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
      ).toBe(
        payload.accountName
          ?.toUpperCase()
          .replace(/\s*&\s*/g, '&')
          .replace(/\s*AND\s*/g, '&')
          .trim(),
      );
      expect(data_ALN.legalOwnerName).toBe(payload.legalOwnerName?.toUpperCase());
      expect(data_ALN.licenses?.[0]?.number).toBe(payload.alcoholLicenseNumber);
      expect(data_ALN.addresses?.[0]?.city).toBe(payload.Address?.[0]?.city?.toUpperCase());
      expect(data_ALN.addresses?.[0]?.state).toBe(payload.Address?.[0]?.state?.toUpperCase());
      expect(data_ALN.addresses?.[0]?.postalCode).toBe(payload.Address?.[0]?.postalCode);
      expect(data_ALN.addresses?.[0]?.country).toBe(payload.Address?.[0]?.country?.toUpperCase());
      expect(data_ALN.addresses?.[0]?.county).toBe(payload.Address?.[0]?.county?.toUpperCase());
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
    alcoholLicenseNumber,
    getCustomerAddress,
  };
}
