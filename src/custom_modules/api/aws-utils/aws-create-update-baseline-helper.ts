/* eslint-disable no-console */
import fs from 'fs';
import { APIRequestContext } from '@playwright/test';

import { runFullFlow } from './aws-flow-helper';
import { getCustomerByGlobalID } from './aws-api-helper';
import { generatePayloadWithFakerData } from '../payload/generate-new-customer-payload';

export const createBaselineWithRetry = async (request: APIRequestContext, baselineFilePath: string, maxRetries = 6) => {
  let attempt = 0;
  let globalID: string | null | undefined;
  let licenceNumber: string | null | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let getCustomerAddress: Record<string, any> | null | undefined;
  const payload = await generatePayloadWithFakerData();
  console.log('Generated payload for New Customer baseline creation:', JSON.stringify(payload, null, 2));
  while (attempt < maxRetries) {
    attempt++;

    try {
      const createResponse = await runFullFlow(
        request,
        payload,
        `Create customer for update baseline (attempt ${attempt})`,
      );

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
