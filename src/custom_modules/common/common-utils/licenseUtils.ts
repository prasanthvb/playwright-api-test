import type { Faker } from '@faker-js/faker';

/**
 * Generates an alcohol license number based on the state code.
 * @param faker The faker instance.
 * @param stateCode The state code (e.g., 'AR', 'TN').
 * @returns A generated license number string.
 */
export const generateLicenseNumber = (faker: Faker, stateCode: string | null): string => {
  switch (stateCode) {
    case 'AR':
      return `${faker.string.numeric(5)}-${faker.string.numeric(2)}`;
    case 'TN':
      return `${faker.string.alpha({ length: 6, casing: 'upper' })}-${faker.string.alpha({ length: 3, casing: 'upper' })}-${faker.string.numeric(faker.number.int({ min: 7, max: 7 }))}`;
    case 'KY':
      return `${faker.string.numeric(10)}`;
    default:
      return faker.string.alphanumeric({
        length: { min: 9, max: 40 },
        casing: 'upper',
      });
  }
};
