import { getAuthenticatedClient } from '../utils/google-auth.js';
import { handleError } from '../utils/error-handler.js';
import { formatAppendResponse } from '../utils/formatters.js';
import { ToolConfig } from '../types/tools';
import { z } from 'zod';

export const appendValuesTool: ToolConfig = {
  title: 'sheets_append_values',
  description: 'Append values to the end of a table in a Google Sheets spreadsheet',
  inputSchema: {
    spreadsheetId: z.string().describe('The ID of the spreadsheet (found in the URL after /d/)'),
    range: z
      .string()
      .describe('The A1 notation range of the table to append to (e.g., "Sheet1!A:B")'),
    values: z
      .array(z.array(z.union([z.string(), z.number(), z.boolean(), z.null()])))
      .describe('A 2D array of values to append, where each inner array represents a row'),
    valueInputOption: z
      .enum(['RAW', 'USER_ENTERED'])
      .optional()
      .describe('How the input data should be interpreted (default: USER_ENTERED)'),
    insertDataOption: z
      .enum(['OVERWRITE', 'INSERT_ROWS'])
      .optional()
      .describe('How the input data should be inserted (default: OVERWRITE)'),
  },
};

export async function handleAppendValues({
  spreadsheetId,
  range,
  values,
  valueInputOption,
  insertDataOption,
}: {
  spreadsheetId: string;
  range: string;
  values: any[][];
  valueInputOption?: 'RAW' | 'USER_ENTERED';
  insertDataOption?: 'OVERWRITE' | 'INSERT_ROWS';
}) {
  try {
    const sheets = await getAuthenticatedClient();

    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: valueInputOption || 'USER_ENTERED',
      insertDataOption: insertDataOption || 'OVERWRITE',
      requestBody: {
        values,
      },
    });

    return formatAppendResponse(response.data.updates || {});
  } catch (error) {
    return handleError(error);
  }
}
