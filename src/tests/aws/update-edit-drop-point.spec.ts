/* eslint-disable no-console */
import { test, expect } from '@playwright/test';
import path from 'path';
import data from '../../data/api-data/test-data.json';
import apiPaths from '../../data/api-data/api-path.json';
import { createBaselineWithRetry } from '../../custom_modules/api/aws-utils/aws-create-update-baseline-helper';
import { getValidDropPointPayload } from '../../custom_modules/api/payload/update-drop-point-payload';
import { runUpdateFlow } from '../../custom_modules/api/aws-utils/aws-update-flow-helper';
const baselineFilePath = path.join(process.cwd(), 'src/data/update-baseline/drop-point.json');

import { awsConfig, getAuthHeaders } from '../../../config/api-config';

const baseUrl = awsConfig.baseUrl;

test.describe('Verify Edit Drop Point API', () => {
  let globalID: string;
  let addressID: string;

  test.beforeAll(async ({ request }) => {
    // This will create a new baseline customer and return globalID and addressID
    const baselineResult = await createBaselineWithRetry(request, baselineFilePath, 3);
    if (baselineResult) {
      globalID = baselineResult.globalID;
      addressID = baselineResult.getCustomerAddress?.addressID ?? '';
      console.log('Extracted addressID from baselineResult:', addressID);
    } else {
      globalID = data.globalIDQA;
      addressID = '';
    }
    if (!globalID || globalID === 'NA') {
      globalID = data.globalIDQA;
    }
    expect(globalID).toBeTruthy();
    expect(addressID, 'addressID must be set from baseline — all baseline creation attempts failed').toBeTruthy();
  });

  test('TC-DP-01 | Verify edit drop point with valid details', async ({ request }) => {
    const payload = getValidDropPointPayload(addressID);
    console.log('Payload for Drop Point Update:', JSON.stringify(payload, null, 2));
    const response = await request.patch(
      `${baseUrl}${apiPaths['update-customer-account-details']}/${globalID}?action=droppoint`,
      { data: payload, headers: getAuthHeaders() },
    );

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.updateRequestID).toBeTruthy();
    console.log(body);

    const updateResult = await runUpdateFlow(request, body, globalID);

    expect(updateResult.status).toBe('active');
    console.log(JSON.stringify(updateResult.updatedCustomer?.body.data.customer.addresses[0], null, 2));
    console.log(JSON.stringify(payload.dropPoint, null, 2));
    expect(updateResult.updatedCustomer?.body.data.customer.addresses[0].locations[0].name.toUpperCase()).toBe(
      payload.dropPoint.name?.toUpperCase(),
    );
    expect(updateResult.updatedCustomer?.body.data.customer.addresses[0].addressID).toBe(payload.dropPoint.addressID);
  });
});
