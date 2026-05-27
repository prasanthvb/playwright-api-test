import { expect, APIRequestContext } from '@playwright/test';
import apiPaths from '../../../data/api-data/api-path.json';
import { awsConfig, getAuthHeaders } from '../../../../config/api-config';

const baseUrl = awsConfig.baseUrl;
/** Poll Get-Update-Request API until status is 'active' or 'error' */
export const pollGetUpdateRequest = async (
  request: APIRequestContext,
  updateRequestID: string,
  globalID: string,
  maxRetries = 20,
  interval = 6000,
) => {
  let responseBody;

  for (let i = 0; i < maxRetries; i++) {
    const response = await request.get(`${baseUrl}${apiPaths['get-update-request']}`, {
      data: {
        updateRequestID,
        globalID,
      },
      headers: getAuthHeaders(),
    });

    expect(response.status()).toBe(200);
    responseBody = await response.json();

    const status = responseBody?.data?.status;
    // eslint-disable-next-line no-console
    console.log(`[poll] attempt ${i + 1}/${maxRetries} → updateRequestID: ${updateRequestID}, status: ${status}`);

    if (status?.toLowerCase() === 'active' || status?.toLowerCase() === 'error') {
      if (status?.toLowerCase() === 'error') {
        // eslint-disable-next-line no-console
        console.error('[poll] Update request returned Error:', JSON.stringify(responseBody?.data, null, 2));
      }
      return responseBody;
    }

    await new Promise((res) => setTimeout(res, interval));
  }

  throw new Error('Update request did not reach final state');
};
