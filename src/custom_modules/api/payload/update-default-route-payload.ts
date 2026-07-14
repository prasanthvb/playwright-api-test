import { faker } from '@faker-js/faker';

interface DefaultRoutePayload {
  defaultRouteId: string;
}

export const getValidDefaultRoutePayload = (): DefaultRoutePayload => {
  return {
    defaultRouteId: faker.string.numeric(7),
  };
};
