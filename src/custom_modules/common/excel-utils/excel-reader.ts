import * as XLSX from 'xlsx';
import * as path from 'path';
import fs from 'fs';

export interface NameRecord {
  actualName: string;
  expectedName: string;
}

/**
 * Reads Excel file and returns list of { firstName, lastName }
 * Ignores header row
 */
export function readNamesFromExcel(): NameRecord[] {
  const filePath = path.resolve(__dirname, '../../../data/excel-data/customer-names.xlsx');

  if (!fs.existsSync(filePath)) {
    throw new Error(`Excel file not found at path: ${filePath}`);
  }

  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const json: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  // Remove header
  json.shift();

  return (
    json
      .filter((row) => row[0] && row[1])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((row: any) => ({
        actualName: row[0].toString().trim(),
        expectedName: row[1].toString().trim(),
      }))
  );
}
