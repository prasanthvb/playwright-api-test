import { faker } from '@faker-js/faker';
import salesOrganizations from '../../../data/api-data/sales-organizations.json';

interface SalesOfficePayload {
  salesOrganizationId: string;
  deliveryZone: string;
  deliveringPlant: string;
  accountingClerk: string;
  description: string;
}

function getRandomSalesOrganizationId(): string {
  const randomIndex = Math.floor(Math.random() * salesOrganizations.length);
  return salesOrganizations[randomIndex].salesOrganizationId;
}

export const getValidSalesOfficePayload = (): SalesOfficePayload => {
  return {
    salesOrganizationId: getRandomSalesOrganizationId(),
    deliveryZone: faker.string.numeric(3),
    deliveringPlant: faker.string.numeric(4),
    accountingClerk: faker.string.numeric(2),
    description: faker.company.name(),
  };
};
