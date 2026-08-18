import { awsConfig } from '../../../../config/api-config';

interface DecodedAuthToken {
  uid?: string;
  email?: string;
  firstName?: string;
  exp?: number;
  iat?: number;
}

/** Decodes the JWT payload of AWS_AUTH_TOKEN (no signature verification) to read the CAS agent claims. */
export function decodeAuthToken(): DecodedAuthToken {
  const token = awsConfig.authToken ?? '';
  const payloadSegment = token.split('.')[1];
  if (!payloadSegment) {
    throw new Error('AWS_AUTH_TOKEN is not a valid JWT (missing payload segment)');
  }
  return JSON.parse(Buffer.from(payloadSegment, 'base64').toString('utf8'));
}
