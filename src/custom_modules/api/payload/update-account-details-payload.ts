import { faker } from '@faker-js/faker';
const contactFirstName = faker.person.firstName();
const contactLastName = faker.person.lastName();
export const getValidAccountDetailsPayload = () => {
  return {
    accountDetails: {
      contactFirstName,
      contactLastName,
      primaryEmail: faker.internet.email({ firstName: contactFirstName, lastName: contactLastName }),
      phone: faker.phone.number({ style: 'national' }),
    },
  };
};

export const getInvalidEmailPayload = () => ({
  accountDetails: {
    contactFirstName,
    contactLastName,
    primaryEmail: 'dave.chappellecontact.com',
    phone: faker.phone.number({ style: 'national' }),
  },
});

export const getInvalidPhonePayload = () => ({
  accountDetails: {
    contactFirstName,
    contactLastName,
    primaryEmail: faker.internet.email({ firstName: contactFirstName, lastName: contactLastName }),
    phone: '(512)234-TEST',
  },
});
