import fs from 'fs';
import path from 'path';
import { expect } from '@playwright/test';

import { runFullFlow } from './aws-flow-helper';
import { getCustomerByGlobalID } from './aws-api-helper';
import { generatePayloadWithFakerData } from '../payload/generate-new-customer-payload';

export const createBaselineWithRetry = async (
  request,
  baselineFilePath: string,
  maxRetries = 6
) => {
  let attempt = 0;
  let globalID: any;
 const payload = await generatePayloadWithFakerData();
 console.log('Generated payload for baseline creation:', payload);
  while (attempt < maxRetries) {
    attempt++;

    try {
      const createResponse = await runFullFlow(
        request,
        payload,
        `Create customer for update baseline (attempt ${attempt})`
      );

      globalID = createResponse?.globalID;

      if (!globalID) {
        throw new Error('GlobalID not returned from create flow');
      }

      const customerResponse = await getCustomerByGlobalID(request, globalID);

      if (!customerResponse) {
        throw new Error('Get Customer returned empty response');
      }

      fs.writeFileSync(
        baselineFilePath,
        JSON.stringify(
          {
            globalID,
            baselineCustomer: customerResponse,
          },
          null,
          2
        )
      );

      return globalID;
    } catch (error) {
      console.warn(
        `Baseline creation failed (attempt ${attempt}): ${error.message}`
      );
    }
  }

  throw new Error(
    `Failed to create baseline customer after ${maxRetries} attempts`
  );
};
