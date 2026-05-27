// Define the type for a Distribution Channel object for better type safety
import { US_LOCATIONS, initLocations } from '../../common/common-utils/locationData';
import { generateLicenseNumber } from '../../common/common-utils/licenseUtils';
import licenseData from '../../../data/api-data/licenseType.json';

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
  overrideLicenseFormat: boolean;
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
  overrideLicenseFormat: false,
};

/**
 * Generates a new payload with unique, faker-generated data for specified fields.
 */
export async function generatePayloadWithFakerData(): Promise<Payload> {
  // Ensure live addresses are fetched from the API before picking a location.
  // initLocations() is safe to call every time — the HTTP request is made only
  // once; every subsequent call awaits the same in-flight Promise.
  await initLocations();

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

  newPayload.Address[0].addressLine1 = randomLocation.addressLine1;
  newPayload.Address[0].city = randomLocation.city;
  newPayload.Address[0].county = randomLocation.county;
  newPayload.Address[0].state = randomLocation.state;
  newPayload.Address[0].postalCode = randomLocation.postalCode;
  newPayload.Address[0].country = 'US';

  newPayload.contactFirstName = firstName;
  newPayload.contactLastName = lastName;
  newPayload.primaryEmail = faker.internet.email({ firstName, lastName });
  newPayload.phone = faker.phone.number({ style: 'national' });
  const state = newPayload.Address[0].state;
  const premise = newPayload.distributionChannel?.Name;
  newPayload.alcoholLicenseNumber = generateLicenseNumber(faker, state);

  const validLicenses = licenseData.filter((item) => item.state === state && item.distributionChannel === premise);

  if (validLicenses.length > 0) {
    const selectedLicense = faker.helpers.arrayElement(validLicenses);
    newPayload.licenseType = selectedLicense.permitCombo;
  } else {
    // Default fallback
    newPayload.licenseType = faker.helpers.arrayElement(['5A', '3A', '8']);
  }
  newPayload.overrideLicenseFormat = false;

  return newPayload;
}
