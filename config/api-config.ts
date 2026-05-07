// config/api-config.ts
import * as dotenv from 'dotenv';

dotenv.config();
export const awsConfig = {
  apiKey: process.env.AWS_API_KEY,
  authToken: process.env.AWS_AUTH_TOKEN,
  baseUrl: process.env.AWS_BASE_URL,
};

export function getAuthHeaders(): Record<string, string> {
  return {
    'x-api-key': awsConfig.apiKey ?? '',
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
