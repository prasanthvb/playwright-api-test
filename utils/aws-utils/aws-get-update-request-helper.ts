import apiPaths from "../../fixtures/api-path.json";
import { expect } from '@playwright/test';

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
      apiPaths['get-update-request'],
      {
        data: {
          updateRequestID,
          globalID,
        },
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
