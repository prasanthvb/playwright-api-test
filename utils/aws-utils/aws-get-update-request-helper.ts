import apiPaths from "../../fixtures/api-path.json";
import { expect } from '@playwright/test';
import { awsConfig } from "../../config/api-config";

const baseUrl = awsConfig.baseUrl;
const apiKey = awsConfig.apiKey;

// Helper to add API key header
function authHeaders() {
  return {
    "x-api-key": apiKey ?? "",
  };
}
/** Poll Get-Update-Request API until status is 'active' or 'error' */
export const pollGetUpdateRequest = async (
  request,
  updateRequestID: string,
  globalID: string,
  maxRetries = 10,
  interval = 5000
) => {
  let responseBody;

  for (let i = 0; i < maxRetries; i++) {
    const response = await request.get(
      `${baseUrl}${apiPaths['get-update-request']}`,
      {
        data: {
          updateRequestID,
          globalID,
        },
        headers: authHeaders(),
      }
    );

    expect(response.status()).toBe(200);
    responseBody = await response.json();

    const status = responseBody?.data?.status;

    if (status === 'active' || status === 'error') {
      return responseBody;
    }

    await new Promise(res => setTimeout(res, interval));
  }

  throw new Error('Update request did not reach final state');
};
