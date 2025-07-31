import { ToolConfig } from '../types/tools.js';
import { getAuthenticatedClient } from '../utils/google-auth.js';
import { handleError } from '../utils/error-handler.js';
import { formatValuesResponse } from '../utils/formatters.js';
import { z } from 'zod';

export const getValuesTool: ToolConfig = {
  title: 'sheets_get_values',
  description: 'Get values from a specified range in a Google Sheets spreadsheet',
  inputSchema: {
    spreadsheetId: z.string().describe('The ID of the spreadsheet (found in the URL after /d/)'),
    range: z.string().describe('The A1 notation range to retrieve (e.g., "Sheet1!A1:B10")'),
    majorDimension: z
      .enum(['ROWS', 'COLUMNS'])
      .optional()
      .describe('The major dimension of the values (default: ROWS)'),
    valueRenderOption: z
      .enum(['FORMATTED_VALUE', 'UNFORMATTED_VALUE', 'FORMULA'])
      .optional()
      .describe('How values should be represented (default: FORMATTED_VALUE)'),
  },
};

export async function handleGetValues({
  spreadsheetId,
  range,
  majorDimension = 'ROWS',
  valueRenderOption = 'FORMATTED_VALUE',
}: {
  spreadsheetId: string;
  range: string;
  majorDimension?: 'ROWS' | 'COLUMNS';
  valueRenderOption?: 'FORMATTED_VALUE' | 'UNFORMATTED_VALUE' | 'FORMULA';
}) {
  try {
    const sheets = await getAuthenticatedClient();

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
      majorDimension,
      valueRenderOption,
    });

    return formatValuesResponse(response.data.values || [], response.data.range);
  } catch (error) {
    return handleError(error);
  }
}
