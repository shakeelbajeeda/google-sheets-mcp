import { getAuthenticatedClient } from '../utils/google-auth.js';
import { handleError } from '../utils/error-handler.js';
import { formatUpdateResponse } from '../utils/formatters.js';
import { z } from 'zod';
import { ToolConfig } from '../types/tools';

export const batchUpdateValuesTool: ToolConfig = {
  title: 'sheets_batch_update_values',
  description: 'Update values in multiple ranges of a Google Sheets spreadsheet',
  inputSchema: {
    spreadsheetId: z.string().describe('The ID of the spreadsheet (found in the URL after /d/)'),
    data: z
      .array(
        z.object({
          range: z.string().describe('The A1 notation range to update'),
          values: z
            .array(z.array(z.union([z.string(), z.number(), z.boolean(), z.null()])))
            .describe('A 2D array of values for this range'),
        })
      )
      .describe('Array of range-value pairs to update'),
    valueInputOption: z
      .enum(['RAW', 'USER_ENTERED'])
      .optional()
      .describe('How the input data should be interpreted (default: USER_ENTERED)'),
  },
};

export async function handleBatchUpdateValues({
  spreadsheetId,
  data,
  valueInputOption,
}: {
  spreadsheetId: string;
  data: Array<{
    range: string;
    values: any[][];
  }>;
  valueInputOption?: 'RAW' | 'USER_ENTERED';
}) {
  try {
    const sheets = await getAuthenticatedClient();

    const response = await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId,
      requestBody: {
        valueInputOption,
        data: data.map((item) => ({
          range: item.range,
          values: item.values,
        })),
      },
    });

    const totalUpdatedCells = response.data.responses
      ? response.data.responses.reduce(
          (sum: number, resp: any) => sum + (resp.updatedCells || 0),
          0
        )
      : 0;

    return formatUpdateResponse(totalUpdatedCells);
  } catch (error) {
    return handleError(error);
  }
}
