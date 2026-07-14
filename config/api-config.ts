// config/api-config.ts
import * as dotenv from 'dotenv';

dotenv.config();

// Get the selected environment (default to QA)
const environment = (process.env.AWS_ENVIRONMENT || 'QA').toUpperCase();

// Map environment to URL and API key
const environmentConfig: Record<string, { url: string; key: string; adminKey: string }> = {
  QA: {
    url: process.env.AWS_BASE_URL_QA || '',
    key: process.env.AWS_API_KEY_QA || '',
    adminKey: process.env.ADMIN_API_KEY_QA || '',
  },
  SANDBOX: {
    url: process.env.AWS_BASE_URL_Sandbox || '',
    key: process.env.AWS_API_KEY_Sandbox || '',
    adminKey: process.env.ADMIN_API_KEY_Sandbox || '',
  },
  DEV: {
    url: process.env.AWS_BASE_URL_Dev || '',
    key: process.env.AWS_API_KEY_Dev || '',
    adminKey: process.env.ADMIN_API_KEY_Dev || '',
  },
};

const config = environmentConfig[environment];
if (!config) {
  throw new Error(`Unknown AWS_ENVIRONMENT: ${environment}. Valid options: QA, Sandbox, Dev`);
}

export const awsConfig = {
  apiKey: config.key,
  adminApiKey: config.adminKey,
  authToken: process.env.AWS_AUTH_TOKEN,
  baseUrl: config.url,
  environment: environment,
};

export function getAuthHeaders(): Record<string, string> {
  return {
    'x-api-key': awsConfig.apiKey ?? '',
    Authorization: awsConfig.authToken ?? '',
  };
}

// The admin route (e.g. update default route) is secured with a separate
// key (secret: orchestration-apikey, key: ADMIN_API_KEY) instead of the
// standard customer API key.
export function getAdminAuthHeaders(): Record<string, string> {
  return {
    'x-api-key': awsConfig.adminApiKey ?? '',
    Authorization: awsConfig.authToken ?? '',
  };
}

export const sfConfig = {
  grant_type: process.env.GRANT_TYPE || '',
  username: process.env.USER_NAME_API || '',
  password: process.env.PASSWORD_API || '',
  client_id: process.env.CLIENTID || '',
  client_secret: process.env.SECRET_KEY || '',
};
