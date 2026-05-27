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
    case 'KY': {
      // KY accepts three formats: ###-xxxx-######  |  ###-xxx-######  |  ###-xx-######
      const formats = [4, 3, 2]; // number of letters in the middle segment
      const letterCount = faker.helpers.arrayElement(formats);
      return `${faker.string.numeric(3)}-${faker.string.alpha({ length: letterCount, casing: 'upper' })}-${faker.string.numeric(6)}`;
    }
    case 'MO': {
      // MO: Standard = 6 digits | Temporary = up to 10 digits, may include a dash
      const moType = faker.helpers.arrayElement(['standard', 'temporary']);
      if (moType === 'standard') {
        return faker.string.numeric(6);
      }
      // Temporary: date-like, ≤10 chars, optionally with a dash (e.g. 04222026 or 04-22-2026)
      const useDash = faker.datatype.boolean();
      const month = faker.string.numeric(2);
      const day = faker.string.numeric(2);
      const year = faker.string.numeric(4);
      return useDash ? `${month}-${day}-${year}` : `${month}${day}${year}`;
    }
    case 'OH': {
      // OH: 7 or 8 digit number, optionally followed by a dash and one more digit
      // Valid: 1234567 | 12345678 | 1234567-1 | 12345678-1 | 1234567811 (10 digits)
      const ohFormat = faker.helpers.arrayElement(['7d', '8d', '7d-1', '8d-1', '10d']);
      if (ohFormat === '7d') return faker.string.numeric(7);
      if (ohFormat === '8d') return faker.string.numeric(8);
      if (ohFormat === '7d-1') return `${faker.string.numeric(7)}-${faker.string.numeric(1)}`;
      if (ohFormat === '8d-1') return `${faker.string.numeric(8)}-${faker.string.numeric(1)}`;
      return faker.string.numeric(10); // 10-digit variant
    }
    case 'KS': {
      // KS: CMB license = C + 5 digits | Other types = 4 to 11 digit numbers (no letters)
      const ksCmb = faker.datatype.boolean();
      if (ksCmb) {
        return `C${faker.string.numeric(5)}`;
      }
      const ksLength = faker.number.int({ min: 4, max: 11 });
      return faker.string.numeric(ksLength);
    }
    case 'TX': {
      // TX: 1 or 2 alpha letters followed by a 9-digit number (e.g. A123456789 or AA123456789)
      const txLetters = faker.helpers.arrayElement([1, 2]);
      return `${faker.string.alpha({ length: txLetters, casing: 'upper' })}${faker.string.numeric(9)}`;
    }
    default:
      return faker.string.alphanumeric({
        length: { min: 9, max: 40 },
        casing: 'upper',
      });
  }
};
