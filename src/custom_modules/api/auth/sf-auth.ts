// authentication for salesforce
import * as dotenv from 'dotenv';

dotenv.config();

import { APIRequestContext } from '@playwright/test';
import { sfConfig } from "../../../../config/api-config";
import apiPaths from "../../../data/api-data/api-path.json";

export async function getSalesforceAuthToken(request: APIRequestContext): Promise<string> {
  // const apiUrl = `${process.env.SF_SANDBOX_URL}${apiPaths['sf-auth']}`;
  const apiUrl= "test";
  const response = await request.post(apiUrl, {
    form: {
      grant_type: sfConfig.grant_type,
      username: sfConfig.username,
      password: sfConfig.password,
      client_id: sfConfig.client_id,
      client_secret: sfConfig.client_secret,
    },
    headers: {
      Accept: '*/*',
    },
  });

  if (response.status() !== 200) {
    throw new Error(`Failed to get SF token: ${response.status()} - ${await response.text()}`);
  }

  const res = await response.json();
  return res.access_token;
}
