import { ToolConfig } from '../types/tools.js';
import { getAuthenticatedClient } from '../utils/google-auth.js';
import { handleError } from '../utils/error-handler.js';
import { formatUpdateResponse } from '../utils/formatters.js';
import { z } from 'zod';

const updateValuesSchema = {
  spreadsheetId: z.string().describe('The ID of the spreadsheet (found in the URL after /d/)'),
  range: z.string(),
  values: z
    .array(z.array(z.union([z.string(), z.number(), z.boolean(), z.null()])))
    .describe('A 2D array of values, where each inner array represents a row.'),
  valueInputOption: z
    .enum(['RAW', 'USER_ENTERED'])
    .optional()
    .describe('How the input data should be interpreted (default: USER_ENTERED).'),
};

export const updateValuesTool: ToolConfig = {
  title: 'sheets_update_values',
  description:
    'Update values in a specified range of a Google Sheets spreadsheet. ' +
    'Examples:\n' +
    '- Fixed range "A1:C3" - must provide exactly 3 rows\n' +
    '- Flexible range "A1" - will expand to fit all provided rows\n' +
    '- To update rows 42-74 (33 rows), use "A42" not "A42:E53"\n' +
    'IMPORTANT: Empty rows in your data array still count as rows!',
  inputSchema: updateValuesSchema,
};

export async function handleUpdateValues({
  spreadsheetId,
  range,
  values,
  valueInputOption = 'USER_ENTERED',
}: {
  spreadsheetId: string;
  range: string;
  values: any[][];
  valueInputOption?: 'RAW' | 'USER_ENTERED';
}) {
  try {
    console.log('got in update vales');
    // Validate range vs values count
    validateRangeRowCount(range, values);

    const sheets = await getAuthenticatedClient();

    const response = await sheets.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption,
      requestBody: {
        values,
      },
    });

    return formatUpdateResponse(response.data.updatedCells || 0, response.data.updatedRange);
  } catch (error) {
    return handleError(error);
  }
}

/**
 * Validates that the number of rows in values matches the range specification
 */
function validateRangeRowCount(range: string, values: any[][]): void {
  // Extract the range without sheet name
  const rangePattern = /([A-Z]+)(\d+):([A-Z]+)(\d+)$/;
  const match = range.match(rangePattern);

  if (!match?.[2] || !match[4]) {
    return;
  }

  const startRow = parseInt(match[2], 10);
  const endRow = parseInt(match[4], 10);
  const expectedRows = endRow - startRow + 1;
  const actualRows = values.length;

  if (expectedRows !== actualRows) {
    throw new Error(
      `Range mismatch: The range "${range}" expects exactly ${expectedRows} rows, ` +
        `but you provided ${actualRows} rows (including any empty rows). ` +
        `\nTo fix this, either:\n` +
        `1. Provide exactly ${expectedRows} rows of data\n` +
        `2. Use a flexible range (e.g., "${range.split(':')[0]}") to auto-expand based on your data\n` +
        `3. Adjust your range to match your data: "${range.split('!')[0]}!${match[1]}${startRow}:${match[3]}${startRow + actualRows - 1}"`
    );
  }
}
