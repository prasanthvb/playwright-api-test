import { test, expect } from "@playwright/test";
import { generatePayloadWithFakerData } from "../../custom_modules/api/payload/generate-new-customer-payload";
import { runFullFlow } from "../../custom_modules/api/aws-utils/aws-flow-helper-verify-account-name";
import { readNamesFromExcel } from "../../custom_modules/common/excel-utils/excel-reader";

const allNames = readNamesFromExcel();

test.describe("CC-01 Create customer using Excel data", () => {
  allNames.forEach((record, index) => {
    test(`CC-01 Row ${index + 1}: Create customer for ${record.actualName}`, async ({
      request,
    }) => {
      const payload = await generatePayloadWithFakerData();

      // Update accountName using Excel row
      payload.accountName = `${record.actualName}`;

      const result = await runFullFlow(
        request,
        payload,
        `Create Customer for ${payload.accountName}`,
        record.expectedName
      );

      expect(result).toBeDefined();
      expect(result.status).toBe(200);

      // Run only when requestID exists
      if (result.requestID) {
        expect(result.getRequestStatus).toBeDefined();
        expect(["Active", "Error"]).toContain(result.getRequestStatus);

        // SUCCESS PATH
        if (result.getRequestStatus === "Active") {
          expect(result.globalID).toBeTruthy();
          expect(result.getCustomerStatus).toBe(200);
          console.log(`✔ Verified Active customer: ${payload.accountName}`);
        }

        // ERROR PATH
        if (result.getRequestStatus === "Error") {
          console.log(`⚠ Customer creation returned Error for ${payload.accountName}`);
        }
      }
    });
  });
});
