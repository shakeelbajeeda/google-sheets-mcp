import { getAuthenticatedClient } from '../utils/google-auth.js';
import { handleError } from '../utils/error-handler.js';
import { formatBatchValuesResponse } from '../utils/formatters.js';
import { ToolConfig } from '../types/tools';
import { z } from 'zod';

export const batchGetValuesTool: ToolConfig = {
  title: 'sheets_batch_get_values',
  description: 'Get values from multiple ranges in a Google Sheets spreadsheet',
  inputSchema: {
    spreadsheetId: z.string().describe('The ID of the spreadsheet (found in the URL after /d/)'),
    ranges: z
      .array(z.string())
      .describe(
        'Array of A1 notation ranges to retrieve (e.g., ["Sheet1!A1:B10", "Sheet2!C1:D5"])'
      ),
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

export async function handleBatchGetValues({
  spreadsheetId,
  ranges,
  majorDimension,
  valueRenderOption,
}: {
  spreadsheetId: string;
  ranges: string[];
  majorDimension?: 'ROWS' | 'COLUMNS';
  valueRenderOption?: 'FORMATTED_VALUE' | 'UNFORMATTED_VALUE' | 'FORMULA';
}) {
  try {
    const sheets = await getAuthenticatedClient();

    const response = await sheets.spreadsheets.values.batchGet({
      spreadsheetId,
      ranges,
      majorDimension,
      valueRenderOption,
    });

    return formatBatchValuesResponse(response.data.valueRanges || []);
  } catch (error) {
    return handleError(error);
  }
}
