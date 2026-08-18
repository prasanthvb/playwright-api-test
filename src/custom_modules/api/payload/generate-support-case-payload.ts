import { faker } from '@faker-js/faker';
import { AVAILABLE_STATES } from '../../common/common-utils/availableStates';

// Confirmed real contract for POST /case-creation - verified against Dev via direct probing
// and matched against the developer's own example requests (curl + Postman). The original
// ticket's field list (subject, suppliedEmail, suppliedPhone, origin, type, subType,
// recordTypeId, isServiceCommunity, bffcreated, caseId, HTTP 201) does not reflect the
// deployed API; message/firstName/lastName/email/shippingState are the real required
// fields, phone is optional, and the response is HTTP 200 with { caseID, caseNumber }.
export interface SupportCasePayload {
  message: string;
  firstName: string;
  lastName: string;
  email: string;
  shippingState: string;
  phone?: string;
}

function randomValidState(): string {
  return AVAILABLE_STATES.length > 0 ? AVAILABLE_STATES[Math.floor(Math.random() * AVAILABLE_STATES.length)] : 'TN';
}

export const getValidSupportCasePayload = (): SupportCasePayload => {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  const email = faker.internet.email({ firstName, lastName });

  return {
    message: faker.lorem.paragraph(),
    firstName,
    lastName,
    email,
    shippingState: randomValidState(),
    phone: faker.string.numeric(10),
  };
};

export const getMissingMessagePayload = (): SupportCasePayload => {
  const payload = getValidSupportCasePayload();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { message: _message, ...rest } = payload;
  return rest as SupportCasePayload;
};

export const getInvalidShippingStatePayload = (): SupportCasePayload => {
  const payload = getValidSupportCasePayload();
  return { ...payload, shippingState: 'Not A Real State' };
};

export const getMalformedEmailPayload = (): SupportCasePayload => {
  const payload = getValidSupportCasePayload();
  return { ...payload, email: 'not-an-email' };
};
