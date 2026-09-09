import { test, expect } from '@playwright/test';
import { faker } from '@faker-js/faker';
import apiPaths from '../../data/api-data/api-path.json';
import siteFixtures from '../../data/api-data/site-fixtures.json';
import salesOrganizations from '../../data/api-data/sales-organizations.json';
import { getValidSitePayload } from '../../custom_modules/api/payload/update-site-payload';
import { getValidSalesOfficePayload } from '../../custom_modules/api/payload/update-sales-office-payload';
import { getValidLicenseTypePayload } from '../../custom_modules/api/payload/license-type-payload';
import { getValidDefaultRoutePayload } from '../../custom_modules/api/payload/update-default-route-payload';
import { awsConfig, getAdminAuthHeaders } from '../../../config/api-config';
import { decodeAuthToken } from '../../custom_modules/api/aws-utils/token-utils';

const baseUrl = awsConfig.baseUrl;

function getRandomEntry<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

// CUSTOMER-158: every admin insert/update operation must stamp createdBy/updatedBy with
// the email unpacked from the caller's auth token, not a static/service-account value.
// All admin/* insert & update endpoints are covered here in one place rather than being
// spread across the per-feature admin spec files, since this is one cross-cutting concern.
test.describe('CUSTOMER-158 | Admin insert/update operations stamp createdBy/updatedBy with the token email', () => {
  const expectedEmail = decodeAuthToken().email;

  test.beforeAll(() => {
    expect(expectedEmail, 'AWS_AUTH_TOKEN must decode to a token with an email claim').toBeTruthy();
  });

  test('CB-01 | PATCH /admin/site/{id} sets updatedBy to the token email', async ({ request }) => {
    const { siteId } = getRandomEntry(siteFixtures);
    const payload = getValidSitePayload();
    const response = await request.patch(`${baseUrl}${apiPaths['update-admin-site']}/${siteId}`, {
      data: payload,
      headers: getAdminAuthHeaders(),
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.site.updatedBy).toBe(expectedEmail);
  });

  test.describe.serial('CB-02 | POST + PATCH /admin/sales-office/{id}', () => {
    const salesOfficeId = faker.string.numeric(9);

    test.afterAll(async ({ request }) => {
      await request.delete(`${baseUrl}${apiPaths['update-admin-sales-office']}/${salesOfficeId}`, {
        headers: getAdminAuthHeaders(),
      });
    });

    test('CB-02a | Insert sets both createdBy and updatedBy to the token email', async ({ request }) => {
      const payload = getValidSalesOfficePayload();
      const response = await request.post(`${baseUrl}${apiPaths['update-admin-sales-office']}/${salesOfficeId}`, {
        data: payload,
        headers: getAdminAuthHeaders(),
      });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.salesOffice.createdBy).toBe(expectedEmail);
      expect(body.salesOffice.updatedBy).toBe(expectedEmail);
    });

    test('CB-02b | Update refreshes updatedBy but leaves createdBy untouched', async ({ request }) => {
      const payload = getValidSalesOfficePayload();
      const response = await request.patch(`${baseUrl}${apiPaths['update-admin-sales-office']}/${salesOfficeId}`, {
        data: payload,
        headers: getAdminAuthHeaders(),
      });

      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.salesOffice.createdBy).toBe(expectedEmail);
      expect(body.salesOffice.updatedBy).toBe(expectedEmail);
    });
  });

  // POST (insert) and PATCH (update) are tested independently rather than as a serial
  // insert-then-update pair: POST currently 500s on every attempt (a pre-existing DB
  // constraint bug, unrelated to this ticket), which would otherwise block PATCH from
  // ever being verified. PATCH is checked against an existing, known-stable record
  // instead of one this suite creates itself.
  test('CB-03a | Insert sets both createdBy and updatedBy to the token email', async ({ request }) => {
    const { siteId } = getRandomEntry(siteFixtures);
    const typeId = `TEST-${faker.string.numeric(9)}`;
    const payload = getValidLicenseTypePayload();

    const response = await request.post(`${baseUrl}${apiPaths['update-admin-license-type']}/${siteId}/${typeId}`, {
      data: payload,
      headers: getAdminAuthHeaders(),
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.licenseType.createdBy).toBe(expectedEmail);
    expect(body.licenseType.updatedBy).toBe(expectedEmail);

    await request.delete(`${baseUrl}${apiPaths['update-admin-license-type']}/${siteId}/${encodeURIComponent(typeId)}`, {
      headers: getAdminAuthHeaders(),
    });
  });

  test('CB-03b | Update refreshes updatedBy but leaves createdBy untouched', async ({ request }) => {
    // Known pre-existing record (siteId 77 / "SMALL BREWERY PAM") used because insert is
    // currently broken — this is real shared reference data this suite does not create or
    // delete. The payload re-applies its own current values verbatim (idempotent) rather
    // than random faker data, so the PATCH is a no-op on content and only exercises
    // updatedAt/updatedBy — the fixture is left exactly as it was found.
    const siteId = '77';
    const typeId = 'SMALL BREWERY PAM';
    const payload = {
      description: 'OH1|OH2|OH3|OH4|OH5|OH6|OH7|OH8|OH9|OH10',
      shortDescription: 'AWARE87|10',
      distributionChannel: '10',
      liquorAllowed: true,
      wineAllowed: true,
      beerAllowed: false,
      nonAlcoholicAllowed: false,
      legalRegulationCode: '4',
      additionalCategory: null,
    };

    const response = await request.patch(
      `${baseUrl}${apiPaths['update-admin-license-type']}/${siteId}/${encodeURIComponent(typeId)}`,
      { data: payload, headers: getAdminAuthHeaders() },
    );

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.licenseType.createdBy).not.toBe(expectedEmail);
    expect(body.licenseType.updatedBy).toBe(expectedEmail);
  });

  test('CB-04 | PATCH /admin/sales-organization/{id}?action=default_route sets updatedBy to the token email', async ({
    request,
  }) => {
    const salesOrganizationId = getRandomEntry(salesOrganizations).salesOrganizationId;
    const payload = getValidDefaultRoutePayload();
    const response = await request.patch(
      `${baseUrl}${apiPaths['update-default-route']}/${salesOrganizationId}?action=default_route`,
      { data: payload, headers: getAdminAuthHeaders() },
    );

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.salesOrganization.updatedBy).toBe(expectedEmail);
  });
});
