import { getAuthenticatedClient } from '../utils/google-auth.js';
import { handleError } from '../utils/error-handler.js';
import { formatClearResponse } from '../utils/formatters.js';
import { z } from 'zod';
import { ToolConfig } from '../types/tools';

export const clearValuesTool: ToolConfig = {
  title: 'sheets_clear_values',
  description: 'Clear values in a specified range of a Google Sheets spreadsheet',
  inputSchema: {
    spreadsheetId: z.string().describe('The ID of the spreadsheet (found in the URL after /d/)'),
    range: z.string().describe('The A1 notation range to clear (e.g., "Sheet1!A1:B10")'),
  },
};

export async function handleClearValues({
  spreadsheetId,
  range,
}: {
  spreadsheetId: string;
  range: string;
}) {
  try {
    const sheets = await getAuthenticatedClient();

    const response = await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range,
    });

    return formatClearResponse(response.data.clearedRange || range);
  } catch (error) {
    return handleError(error);
  }
}
