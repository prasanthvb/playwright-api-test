import { faker } from '@faker-js/faker';

const name = ['Garage', 'Front Doorstep', 'Back Doorstep', 'Dock', 'Back Porch', 'Mailbox', 'Reception'];
interface dropPoint {
  addressID?: string;
  name?: string;
}

export const getValidDropPointPayload = (addressID: string): { dropPoint: dropPoint } => {
  const selectedTerm = faker.helpers.arrayElement(name);

  return {
    dropPoint: {
      addressID,
      name: selectedTerm,
    },
  };
};

export const getMissingAddressIDDropPointPayload = (): {
  dropPoint: dropPoint;
} => {
  const selectedTerm = faker.helpers.arrayElement(name);

  return {
    dropPoint: {
      name: selectedTerm,
    },
  };
};

export const getEmptyNameDropPointPayload = (addressID: string): { dropPoint: dropPoint } => {
  return {
    dropPoint: {
      addressID,
      name: '',
    },
  };
};

export const getInvalidAddressIDDropPointPayload = (): {
  dropPoint: dropPoint;
} => {
  const selectedTerm = faker.helpers.arrayElement(name);

  return {
    dropPoint: {
      addressID: 'InvalidAddressID',
      name: selectedTerm,
    },
  };
};

export const getMissingDropPointPayload = (): Record<string, never> => {
  return {};
};
