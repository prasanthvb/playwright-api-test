import { faker } from "@faker-js/faker";
const number = faker.string.alphanumeric({
  length: { min: 9, max: 40 },
  casing: "upper",
});

import data from "../../../data/api-data/test-data.json";
const types = ["AL", "B", "CC", "CL", "HR", "IA", "L", "LD", "LP", "LR", "M", "MA", "MD", "ML", "N", "NA", "NO", "PC"];
const formatDate = (date: Date) => date.toISOString().split("T")[0];
export const getValidLicensePayload = () => {
  return {
    license: {
      number,
      effectiveDate: formatDate(faker.date.past({ years: 1 })),
      expirationDate: formatDate(faker.date.future({ years: 1 })),
      type: faker.helpers.arrayElement(types),
      operation: "",
    },
  };
};

export const getDuplicateLicensePayload = () => ({
  license: {
      number: data.licenseID,
      effectiveDate: formatDate(faker.date.past({ years: 1 })),
      expirationDate: formatDate(faker.date.future({ years: 1 })),
      type: faker.helpers.arrayElement(types),
      operation: "",
    },
});

export const getInvalidLicenseTypePayload = () => ({
  license: {
    number,
    effectiveDate: formatDate(faker.date.past({ years: 1 })),
    expirationDate: formatDate(faker.date.future({ years: 1 })),
    type: "invalid_type",
    operation: "",
  },
});

export const getInvalidLicenseDatesPayload = () => ({
  license: {
    number,
    effectiveDate: formatDate(faker.date.future({ years: 1 })),
    expirationDate: formatDate(faker.date.past({ years: 1 })),
    type: faker.helpers.arrayElement(types),
    operation: "",
  },
});

export const getMissingLicenseNumberPayload = () => ({
  license: {
    effectiveDate: formatDate(faker.date.past({ years: 1 })),
    expirationDate: formatDate(faker.date.future({ years: 1 })),
    type: faker.helpers.arrayElement(types),
    operation: "",
  },
});

export const getMissingLicenseDatesPayload = () => ({
  license: {
    number,
    type: faker.helpers.arrayElement(types),
    operation: "",
  },
});

export const getMissingLicenseTypePayload = () => ({
  license: {
    number,
    effectiveDate: formatDate(faker.date.past({ years: 1 })),
    expirationDate: formatDate(faker.date.future({ years: 1 })),
    operation: "",
  },
});

export const addNewLicensePayload = () => ({
  license: {
    number,
    effectiveDate: formatDate(faker.date.past({ years: 1 })),
    expirationDate: formatDate(faker.date.future({ years: 1 })),
    type: faker.helpers.arrayElement(types),
    operation: "add",
  },
});