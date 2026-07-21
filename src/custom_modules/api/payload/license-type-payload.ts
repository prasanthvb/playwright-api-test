import { faker } from '@faker-js/faker';

interface LicenseTypePayload {
  description: string;
  shortDescription: string;
  distributionChannel: string;
  liquorAllowed: boolean;
  wineAllowed: boolean;
  beerAllowed: boolean;
  nonAlcoholicAllowed: boolean;
  legalRegulationCode: string;
  additionalCategory: string | null;
}

export const getValidLicenseTypePayload = (): LicenseTypePayload => {
  return {
    description: faker.commerce.productName(),
    shortDescription: faker.string.alpha({ length: 5, casing: 'upper' }),
    distributionChannel: faker.helpers.arrayElement(['On Premise', 'Off Premise']),
    liquorAllowed: faker.datatype.boolean(),
    wineAllowed: faker.datatype.boolean(),
    beerAllowed: faker.datatype.boolean(),
    nonAlcoholicAllowed: faker.datatype.boolean(),
    legalRegulationCode: faker.string.numeric(1),
    additionalCategory: null,
  };
};
