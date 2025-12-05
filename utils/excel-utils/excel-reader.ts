import * as XLSX from "xlsx";
import * as path from "path";

export interface NameRecord {
  actualName: string;
  expectedName: string;
}

/**
 * Reads Excel file and returns list of { firstName, lastName }
 * Ignores header row
 */
export function readNamesFromExcel(): NameRecord[] {
  const filePath = path.resolve(__dirname, "../../data/customer-names.xlsx");

  if (!require("fs").existsSync(filePath)) {
    throw new Error(`Excel file not found at path: ${filePath}`);
  }

  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const json: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  // Remove header
  json.shift();

  return json
    .filter((row) => row[0] && row[1])
    .map((row) => ({
      actualName: row[0].toString().trim(),
      expectedName: row[1].toString().trim(),
    }));
}
