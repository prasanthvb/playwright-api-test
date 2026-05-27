import { faker } from '@faker-js/faker';
import { US_LOCATIONS, LocationEntry } from '../../common/common-utils/locationData';

// Select a random location from our utility list
const randomLocation = faker.helpers.arrayElement(US_LOCATIONS);

export const getValidBillingAddressPayload = (location?: LocationEntry) => {
  const loc = location ?? randomLocation;
  return {
    billingAddress: {
      sameAsShipping: false,
      billingEntityName: faker.company.name(),
      addressLine1: loc.addressLine1,
      city: loc.city,
      state: loc.state,
      postalCode: loc.postalCode,
    },
  };
};

export const getInvalidBillingAddressPayload = () => ({
  billingAddress: {
    sameAsShipping: false,
    billingEntityName: faker.company.name(),
    addressLine1: faker.location.streetAddress(),
    city: randomLocation.city,
    state: 'InvalidState',
    postalCode: 'InvalidPostalCode',
  },
});

export const getSameAsShippingBillingAddressPayload = () => ({
  billingAddress: {
    sameAsShipping: true,
  },
});

export const getEmptyBillingAddressPayload = () => ({
  billingAddress: {
    sameAsShipping: false,
    billingEntityName: '',
    addressLine1: '',
    city: '',
    state: '',
    postalCode: '',
  },
});

export const getPartiallyEmptyBillingAddressPayload = () => ({
  billingAddress: {
    sameAsShipping: false,
    billingEntityName: faker.company.name(),
    addressLine1: '',
    city: randomLocation.city,
    state: randomLocation.state,
    postalCode: '',
  },
});

export const getNonUSBillingAddressPayload = () => ({
  billingAddress: {
    sameAsShipping: false,
    billingEntityName: faker.company.name(),
    addressLine1: faker.location.streetAddress(),
    city: faker.location.city(),
    state: faker.location.state(),
    postalCode: faker.location.zipCode(),
    country: 'CA', // Canada
  },
});
