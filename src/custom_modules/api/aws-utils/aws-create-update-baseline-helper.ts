/* eslint-disable no-console */
import fs from 'fs';
import { APIRequestContext } from '@playwright/test';

import { runFullFlow } from './aws-flow-helper';
import { getCustomerByGlobalID, pollGetRequest } from './aws-api-helper';
import { generatePayloadWithFakerData } from '../payload/generate-new-customer-payload';

export const createBaselineWithRetry = async (request: APIRequestContext, baselineFilePath: string, maxRetries = 6) => {
  let attempt = 0;
  let globalID: string | null | undefined;
  let licenceNumber: string | null | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let getCustomerAddress: Record<string, any> | null | undefined;

  while (attempt < maxRetries) {
    attempt++;
    // Generate a fresh payload on every attempt so a bad address from the
    // random-address API doesn't cause every retry to fail with the same error.
    const payload = await generatePayloadWithFakerData();
    if (attempt === 1) {
      console.log('Generated payload for New Customer baseline creation:', JSON.stringify(payload, null, 2));
    }

    try {
      const createResponse = await runFullFlow(
        request,
        payload,
        `Create customer for update baseline (attempt ${attempt})`,
      );

      // If the request is still Pending after runFullFlow's default polling,
      // wait up to 60 extra seconds (12 × 5 s) polling the same requestID.
      if (createResponse.getRequestStatus === 'Pending' && createResponse.requestID) {
        console.log(`⏳ Status still Pending — extending poll up to 60 s for requestID ${createResponse.requestID}`);
        const extended = await pollGetRequest(request, createResponse.requestID, 12, 5);
        console.log(
          `🔁 Extended poll result → Status=${extended.status || 'N/A'}, GlobalID=${extended.globalID || 'N/A'}`,
        );
        createResponse.getRequestStatus = extended.status ?? undefined;
        createResponse.globalID = extended.globalID ?? undefined;
        createResponse.alcoholLicenseNumber = extended.alcoholLicenseNumber ?? undefined;

        // runFullFlow returned before fetching the customer (it was Pending at the time).
        // Now that we have a globalID, fetch the customer and populate getCustomerAddress.
        if (extended.status === 'Active' && extended.globalID) {
          const customerData = await getCustomerByGlobalID(request, extended.globalID);
          createResponse.getCustomerAddress = customerData.body?.data?.customer?.addresses?.[0] ?? null;
        }
      }

      globalID = createResponse?.globalID;
      licenceNumber = createResponse?.alcoholLicenseNumber;
      getCustomerAddress = createResponse.getCustomerAddress;
      if (!globalID) {
        throw new Error('GlobalID not returned from create flow');
      }

      const customerResponse = await getCustomerByGlobalID(request, globalID);

      if (!customerResponse) {
        throw new Error('Get Customer returned empty response');
      }

      if (baselineFilePath) {
        try {
          fs.writeFileSync(
            baselineFilePath,
            JSON.stringify(
              {
                globalID,
                baselineCustomer: customerResponse,
              },
              null,
              2,
            ),
          );
        } catch (err) {
          console.warn(`Failed to write baseline file: ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      return { globalID, licenceNumber, getCustomerAddress };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn(`Baseline creation failed (attempt ${attempt}): ${errorMessage}`);
    }
  }
};
