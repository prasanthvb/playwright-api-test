export const getValidAccountDetailsPayload = () => ({
  accountDetails: {
    contactFirstName: 'NBavish',
    contactLastName: 'Chappelle',
    primaryEmail: 'dave.chappelle@contact.com',
    phone: '(512)234-2345',
  },
});

export const getInvalidEmailPayload = () => ({
  accountDetails: {
    contactFirstName: 'NBavish',
    contactLastName: 'Chappelle',
    primaryEmail: 'dave.chappellecontact.com',
    phone: '(512)234-2345',
  },
});

export const getInvalidPhonePayload = () => ({
  accountDetails: {
    contactFirstName: 'NBavish',
    contactLastName: 'Chappelle',
    primaryEmail: 'dave.chappelle@contact.com',
    phone: '(512)234-TEST',
  },
});
