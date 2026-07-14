import { test, expect } from '@playwright/test';
import apiPaths from '../../data/api-data/api-path.json';
import salesOrganizations from '../../data/api-data/sales-organizations.json';
import { getValidDefaultRoutePayload } from '../../custom_modules/api/payload/update-default-route-payload';

import { awsConfig, getAdminAuthHeaders } from '../../../config/api-config';

const baseUrl = awsConfig.baseUrl;

function getRandomSalesOrganizationId(): string {
  const randomIndex = Math.floor(Math.random() * salesOrganizations.length);
  return salesOrganizations[randomIndex].salesOrganizationId;
}

test.describe('Verify Admin Update Default Route API', () => {
  test('TC-ADR-01 | Verify update default route with valid defaultRouteId', async ({ request }) => {
    const salesOrganizationId = getRandomSalesOrganizationId();
    const payload = getValidDefaultRoutePayload();
    const response = await request.patch(
      `${baseUrl}${apiPaths['update-default-route']}/${salesOrganizationId}?action=default_route`,
      {
        data: payload,
        headers: getAdminAuthHeaders(),
      },
    );

    expect(response.status()).toBe(200);

    const body = await response.json();
    console.log(body.salesOrganization);
    expect(body.salesOrganization.defaultRouteId).toBe(payload.defaultRouteId);
    // Success response should return the full sales_organization row, not just the updated field
    expect(Object.keys(body.salesOrganization).length).toBeGreaterThan(1);
  });
});
