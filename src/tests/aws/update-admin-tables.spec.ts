import { test, expect } from '@playwright/test';
import { faker } from '@faker-js/faker';
import apiPaths from '../../data/api-data/api-path.json';
import siteFixtures from '../../data/api-data/site-fixtures.json';
import { getValidSitePayload } from '../../custom_modules/api/payload/update-site-payload';
import { getValidSalesOfficePayload } from '../../custom_modules/api/payload/update-sales-office-payload';
import { getValidLicenseTypePayload } from '../../custom_modules/api/payload/license-type-payload';

import { awsConfig, getAdminAuthHeaders } from '../../../config/api-config';

const baseUrl = awsConfig.baseUrl;

function getRandomEntry<T>(items: T[]): T {
  const randomIndex = Math.floor(Math.random() * items.length);
  return items[randomIndex];
}

test.describe('Verify Admin Update Site API', () => {
  test('TC-AS-01 | Verify update site with valid accountSiteID', async ({ request }) => {
    const { siteId } = getRandomEntry(siteFixtures);
    const payload = getValidSitePayload();
    const response = await request.patch(`${baseUrl}${apiPaths['update-admin-site']}/${siteId}`, {
      data: payload,
      headers: getAdminAuthHeaders(),
    });

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.site.accountSiteID).toBe(payload.accountSiteID);
    // Success response should return the full site row, not just the updated field
    expect(Object.keys(body.site).length).toBeGreaterThan(1);
  });
});

// Serial: each test operates on the same sales_office row created in TC-ASO-01,
// so this suite is self-contained and leaves no residue in the sales_office table.
test.describe.serial('Verify Admin Sales Office API', () => {
  const salesOfficeId = faker.string.numeric(9);

  test('TC-ASO-01 | Verify add sales office with all required fields', async ({ request }) => {
    const payload = getValidSalesOfficePayload();
    const response = await request.post(`${baseUrl}${apiPaths['update-admin-sales-office']}/${salesOfficeId}`, {
      data: payload,
      headers: getAdminAuthHeaders(),
    });

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.salesOffice.salesOfficeId).toBe(salesOfficeId);
    expect(body.salesOffice.salesOrganizationId).toBe(payload.salesOrganizationId);
    expect(body.salesOffice.deliveryZone).toBe(payload.deliveryZone);
    expect(body.salesOffice.deliveringPlant).toBe(payload.deliveringPlant);
    expect(body.salesOffice.accountingClerk).toBe(payload.accountingClerk);
    expect(body.salesOffice.description).toBe(payload.description);
  });

  test('TC-ASO-02 | Verify edit sales office with all required fields', async ({ request }) => {
    const payload = getValidSalesOfficePayload();
    const response = await request.patch(`${baseUrl}${apiPaths['update-admin-sales-office']}/${salesOfficeId}`, {
      data: payload,
      headers: getAdminAuthHeaders(),
    });

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.salesOffice.salesOrganizationId).toBe(payload.salesOrganizationId);
    expect(body.salesOffice.deliveryZone).toBe(payload.deliveryZone);
    expect(body.salesOffice.deliveringPlant).toBe(payload.deliveringPlant);
    expect(body.salesOffice.accountingClerk).toBe(payload.accountingClerk);
    expect(body.salesOffice.description).toBe(payload.description);
  });

  test('TC-ASO-03 | Verify delete sales office', async ({ request }) => {
    const response = await request.delete(`${baseUrl}${apiPaths['update-admin-sales-office']}/${salesOfficeId}`, {
      headers: getAdminAuthHeaders(),
    });

    expect(response.status()).toBe(200);

    // Confirm the row is actually gone
    const verifyResponse = await request.patch(`${baseUrl}${apiPaths['update-admin-sales-office']}/${salesOfficeId}`, {
      data: getValidSalesOfficePayload(),
      headers: getAdminAuthHeaders(),
    });
    expect(verifyResponse.status()).toBe(404);
  });
});

// Serial: each test operates on the same license_type row created in TC-ALT-01,
// so this suite is self-contained and leaves no residue in the license_type table.
test.describe.serial('Verify Admin License Type API', () => {
  const { siteId } = getRandomEntry(siteFixtures);
  const typeId = `TEST-${faker.string.numeric(9)}`;

  test('TC-ALT-01 | Verify add license type with all required fields', async ({ request }) => {
    const payload = getValidLicenseTypePayload();
    const response = await request.post(`${baseUrl}${apiPaths['update-admin-license-type']}/${siteId}/${typeId}`, {
      data: payload,
      headers: getAdminAuthHeaders(),
    });

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.licenseType.typeId).toBe(typeId);
    expect(body.licenseType.description).toBe(payload.description);
    expect(body.licenseType.shortDescription).toBe(payload.shortDescription);
    expect(body.licenseType.distributionChannel).toBe(payload.distributionChannel);
    expect(body.licenseType.liquorAllowed).toBe(payload.liquorAllowed);
    expect(body.licenseType.wineAllowed).toBe(payload.wineAllowed);
    expect(body.licenseType.beerAllowed).toBe(payload.beerAllowed);
    expect(body.licenseType.nonAlcoholicAllowed).toBe(payload.nonAlcoholicAllowed);
    expect(body.licenseType.legalRegulationCode).toBe(payload.legalRegulationCode);
  });

  test('TC-ALT-02 | Verify edit license type with all required fields', async ({ request }) => {
    const payload = getValidLicenseTypePayload();
    const response = await request.patch(
      `${baseUrl}${apiPaths['update-admin-license-type']}/${siteId}/${encodeURIComponent(typeId)}`,
      {
        data: payload,
        headers: getAdminAuthHeaders(),
      },
    );

    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(body.licenseType.description).toBe(payload.description);
    expect(body.licenseType.shortDescription).toBe(payload.shortDescription);
    expect(body.licenseType.distributionChannel).toBe(payload.distributionChannel);
    expect(body.licenseType.liquorAllowed).toBe(payload.liquorAllowed);
    expect(body.licenseType.wineAllowed).toBe(payload.wineAllowed);
    expect(body.licenseType.beerAllowed).toBe(payload.beerAllowed);
    expect(body.licenseType.nonAlcoholicAllowed).toBe(payload.nonAlcoholicAllowed);
    expect(body.licenseType.legalRegulationCode).toBe(payload.legalRegulationCode);
  });

  test('TC-ALT-03 | Verify delete license type', async ({ request }) => {
    const response = await request.delete(
      `${baseUrl}${apiPaths['update-admin-license-type']}/${siteId}/${encodeURIComponent(typeId)}`,
      {
        headers: getAdminAuthHeaders(),
      },
    );

    expect(response.status()).toBe(200);

    // Confirm the row is actually gone
    const verifyResponse = await request.patch(
      `${baseUrl}${apiPaths['update-admin-license-type']}/${siteId}/${encodeURIComponent(typeId)}`,
      {
        data: getValidLicenseTypePayload(),
        headers: getAdminAuthHeaders(),
      },
    );
    expect(verifyResponse.status()).toBe(404);
  });
});
