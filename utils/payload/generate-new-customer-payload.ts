import { faker } from '@faker-js/faker';

// Define the type for a Distribution Channel object for better type safety
interface DistributionChannel {
    Code: "20" | "10";
    Name: "Off Premise" | "On Premise";
}

// Define the two possible distribution channel options
const distributionChannels: DistributionChannel[] = [
    { Code: "20", Name: "Off Premise" },
    { Code: "10", Name: "On Premise" }
];

// Define the main payload structure interface
interface Payload {
    accountName: string;
    legalOwnerName: string;
    distributionChannel: DistributionChannel;
    Address: Array<{
        addressType: string;
        addressLine1: string;
        city: string;
        county: string;
        state: string;
        postalCode: string;
        country: string;
    }>;
    contactFirstName: string;
    contactLastName: string;
    primaryEmail: string;
    phone: string;
    alcoholLicenseNumber: string;
}

/**
 * This module provides a base payload structure and a function to generate
 * a new payload with unique, faker-generated data for testing purposes.
 */
export const basePayload: Payload = {
    "accountName": "",
    "legalOwnerName": "",
    // Initial state set to an empty channel object
    "distributionChannel": { 
        "Code": "20", // Default to one code, but it will be overwritten
        "Name": "Off Premise" 
    },
    "Address": [
        {
           "addressType": "Shipping",
            "addressLine1": "",
            "city": "",
            "county": "",
            "state": "",
            "postalCode": "",
            "country": "US"
        }
    ],
    "contactFirstName": "",
    "contactLastName": "",
    "primaryEmail": "",
    "phone": "",
    "alcoholLicenseNumber": ""
};

/**
 * Generates a new payload with unique, faker-generated data for specified fields.
 */
export function generatePayloadWithFakerData(): Payload {
    // We cast the parsed object to Payload to ensure type safety after deep cloning
    const newPayload = JSON.parse(JSON.stringify(basePayload)) as Payload;

    // Generate random data using faker
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    
    // *** LOGIC FOR RANDOM DISTRIBUTION CHANNEL ***
    // Select a random channel object from the defined array
    const selectedChannel = faker.helpers.arrayElement(distributionChannels);
    
    // Assign faker data to the cloned payload
    newPayload.accountName = faker.company.name();
    newPayload.legalOwnerName = faker.company.name() + ' LLC';
    
    // *** Assign the randomly selected distribution channel ***
    newPayload.distributionChannel.Code = selectedChannel.Code;
    newPayload.distributionChannel.Name = selectedChannel.Name;

    newPayload.Address[0].addressLine1 = faker.location.streetAddress();
    newPayload.Address[0].city = faker.location.city();
    newPayload.Address[0].county = faker.location.county();
    newPayload.Address[0].state = faker.location.state({ abbreviated: true });
    newPayload.Address[0].postalCode = faker.location.zipCode("#####");
    newPayload.contactFirstName = firstName;
    newPayload.contactLastName = lastName;
    newPayload.primaryEmail = faker.internet.email({ firstName, lastName });
    newPayload.phone = faker.phone.number({ style: 'national' });
    
    // License number with min 9, max 40 characters
    newPayload.alcoholLicenseNumber = faker.string.alphanumeric({ length: { min: 9, max: 40 }, casing: 'upper' });

    return newPayload;
}
