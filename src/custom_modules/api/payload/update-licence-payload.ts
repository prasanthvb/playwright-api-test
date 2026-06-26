import { faker } from '@faker-js/faker';
const number = faker.string.alphanumeric({
  length: { min: 9, max: 40 },
  casing: 'upper',
});

import data from '../../../data/api-data/test-data.json';
import licenseTypes from '../../../data/api-data/licenseType.json';

const formatDate = (date: Date) => date.toISOString().split('T')[0];

// Helper function to get valid license types (permitCombo) for a given state
const getValidLicenseTypesForState = (state: string): string[] => {
  const stateLicenseTypes = licenseTypes.filter((license) => license.state === state);
  return stateLicenseTypes.map((license) => license.permitCombo);
};

// Helper function to get a random license type for a state
const getRandomLicenseTypeForState = (state: string): string => {
  const validTypes = getValidLicenseTypesForState(state);
  if (validTypes.length === 0) {
    throw new Error(`No valid license types found for state: ${state}`);
  }
  return faker.helpers.arrayElement(validTypes);
};

// Helper function to get a different license type for the same state
const getDifferentLicenseTypeForState = (state: string, currentType: string): string => {
  const validTypes = getValidLicenseTypesForState(state).filter((type) => type !== currentType);
  if (validTypes.length === 0) {
    throw new Error(`No alternative license types found for state: ${state}`);
  }
  return faker.helpers.arrayElement(validTypes);
};
export const getValidLicensePayload = (state: string) => {
  return {
    license: {
      number,
      effectiveDate: formatDate(faker.date.past({ years: 1 })),
      expirationDate: formatDate(faker.date.future({ years: 1 })),
      type: getRandomLicenseTypeForState(state),
      operation: '',
    },
  };
};

export const getDuplicateLicensePayload = (state: string) => ({
  license: {
    number: data.licenseID,
    effectiveDate: formatDate(faker.date.past({ years: 1 })),
    expirationDate: formatDate(faker.date.future({ years: 1 })),
    type: getRandomLicenseTypeForState(state),
    operation: '',
  },
});

export const getInvalidLicenseTypePayload = () => ({
  license: {
    number,
    effectiveDate: formatDate(faker.date.past({ years: 1 })),
    expirationDate: formatDate(faker.date.future({ years: 1 })),
    type: 'invalid_type',
    operation: '',
  },
});

export const getInvalidLicenseDatesPayload = (state: string) => ({
  license: {
    number,
    effectiveDate: formatDate(faker.date.future({ years: 1 })),
    expirationDate: formatDate(faker.date.past({ years: 1 })),
    type: getRandomLicenseTypeForState(state),
    operation: '',
  },
});

export const getMissingLicenseNumberPayload = (state: string) => ({
  license: {
    effectiveDate: formatDate(faker.date.past({ years: 1 })),
    expirationDate: formatDate(faker.date.future({ years: 1 })),
    type: getRandomLicenseTypeForState(state),
    operation: '',
  },
});

export const getMissingLicenseDatesPayload = (state: string) => ({
  license: {
    number,
    type: getRandomLicenseTypeForState(state),
    operation: '',
  },
});

export const getMissingLicenseTypePayload = () => ({
  license: {
    number,
    effectiveDate: formatDate(faker.date.past({ years: 1 })),
    expirationDate: formatDate(faker.date.future({ years: 1 })),
    operation: '',
  },
});

export const addNewLicensePayload = (state: string) => ({
  license: {
    number,
    effectiveDate: formatDate(faker.date.past({ years: 1 })),
    expirationDate: formatDate(faker.date.future({ years: 1 })),
    type: getRandomLicenseTypeForState(state),
    operation: 'add',
  },
});

export const getDifferentLicenseDetailsPayload = (
  existingLicenseNumber: string,
  state: string,
  currentType: string,
) => ({
  license: {
    number: existingLicenseNumber,
    effectiveDate: formatDate(faker.date.past({ years: 1 })),
    expirationDate: formatDate(faker.date.future({ years: 1 })),
    type: getDifferentLicenseTypeForState(state, currentType), // Different license type from the original
    operation: 'add',
  },
});
