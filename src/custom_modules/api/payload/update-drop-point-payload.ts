import { faker } from '@faker-js/faker';

const name = ['Garage', 'Front Doorstep', 'Back Doorstep', 'Dock', 'Back Porch', 'Mailbox', 'Reception'];
const note = 'Make no noise, Testing drop point update';
interface dropPoint {
  addressID?: string;
  name?: string;
  notes?: string;
}

export const getValidDropPointPayload = (addressID: string): { dropPoint: dropPoint } => {
  const selectedName = faker.helpers.arrayElement(name);

  return {
    dropPoint: {
      addressID,
      name: selectedName,
      notes: note,
    },
  };
};

export const getMissingAddressIDDropPointPayload = (): {
  dropPoint: dropPoint;
} => {
  const selectedName = faker.helpers.arrayElement(name);

  return {
    dropPoint: {
      name: selectedName,
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
  const selectedName = faker.helpers.arrayElement(name);

  return {
    dropPoint: {
      addressID: 'InvalidAddressID',
      name: selectedName,
    },
  };
};

export const getMissingDropPointPayload = (): Record<string, never> => {
  return {};
};
