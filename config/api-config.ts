// config/api-config.ts
import * as dotenv from 'dotenv';

dotenv.config();
export const awsConfig = {
  apiKey: process.env.AWS_API_KEY,
};

export const sfConfig = {
  grant_type: process.env.GRANT_TYPE || "",
  username: process.env.USER_NAME_API || "",
  password: process.env.PASSWORD_API || "",
  client_id: process.env.CLIENTID || "",
  client_secret: process.env.SECRET_KEY || "",
};
