import { faker } from '@faker-js/faker';

interface SitePayload {
  accountSiteID: string;
}

export const getValidSitePayload = (): SitePayload => {
  return {
    accountSiteID: faker.string.numeric(7),
  };
};
