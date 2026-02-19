// Define the type for a Distribution Channel object for better type safety
import { US_LOCATIONS } from '../../common/common-utils/locationData';

export interface DistributionChannel {
  Code: '20' | '10';
  Name: 'Off Premise' | 'On Premise';
}

// Define the two possible distribution channel options
const distributionChannels: DistributionChannel[] = [
  { Code: '20', Name: 'Off Premise' },
  { Code: '10', Name: 'On Premise' },
];

// Define the main payload structure interface
export interface Payload {
  accountName: string | null;
  legalOwnerName: string | null;
  distributionChannel: DistributionChannel | null;
  Address: Array<{
    addressType: string | null;
    addressLine1: string | null;
    city: string | null;
    county: string | null;
    state: string | null;
    postalCode: string | null;
    country: string | null;
  }>;
  contactFirstName: string | null;
  contactLastName: string | null;
  primaryEmail: string | null;
  phone: string | null;
  alcoholLicenseNumber: string | null;
  licenseType?: string | null;
}

/**
 * This module provides a base payload structure and a function to generate
 * a new payload with unique, faker-generated data for testing purposes.
 */
export const basePayload: Payload = {
  accountName: '',
  legalOwnerName: '',
  distributionChannel: {
    Code: '20',
    Name: 'Off Premise',
  },
  Address: [
    {
      addressType: 'Shipping',
      addressLine1: '',
      city: '',
      county: '',
      state: '',
      postalCode: '',
      country: 'US',
    },
  ],
  contactFirstName: '',
  contactLastName: '',
  primaryEmail: '',
  phone: '',
  alcoholLicenseNumber: '',
  licenseType: '',
};

/**
 * Generates a new payload with unique, faker-generated data for specified fields.
 */
export async function generatePayloadWithFakerData(): Promise<Payload> {
  // Dynamically import faker (ESM compatible)
  const { faker } = await import('@faker-js/faker');

  // Deep clone the base payload
  const newPayload = JSON.parse(JSON.stringify(basePayload)) as Payload;

  // Generate random data
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();

  // 1. Select random distribution channel
  const selectedChannel = faker.helpers.arrayElement(distributionChannels);

  // 2. Select a random location from our utility list
  const randomLocation = faker.helpers.arrayElement(US_LOCATIONS);

  // Assign faker-generated data
  newPayload.accountName = faker.company.name();
  newPayload.legalOwnerName = `${faker.company.name()} LLC`;
  newPayload.distributionChannel = selectedChannel;

  newPayload.Address[0].addressLine1 = faker.location.streetAddress();
  newPayload.Address[0].city = randomLocation.city;
  newPayload.Address[0].county = randomLocation.county;
  newPayload.Address[0].state = randomLocation.state;
  newPayload.Address[0].postalCode = randomLocation.postalCode;
  newPayload.Address[0].country = 'US';

  newPayload.contactFirstName = firstName;
  newPayload.contactLastName = lastName;
  newPayload.primaryEmail = faker.internet.email({ firstName, lastName });
  newPayload.phone = faker.phone.number({ style: 'national' });
  newPayload.alcoholLicenseNumber = faker.string.alphanumeric({
    length: { min: 9, max: 40 },
    casing: 'upper',
  });
  if (newPayload.Address[0].state === 'TN') {
    newPayload.licenseType = '8';
  } else {
    newPayload.licenseType = faker.helpers.arrayElement(['5A', '3A', '8']);
  }
  return newPayload;
}
