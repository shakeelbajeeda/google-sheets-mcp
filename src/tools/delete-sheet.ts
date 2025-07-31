import { ToolConfig } from '../types/tools.js';
import { getAuthenticatedClient } from '../utils/google-auth.js';
import { handleError } from '../utils/error-handler.js';
import { formatSheetOperationResponse } from '../utils/formatters.js';
import { z } from 'zod';

export const deleteSheetTool: ToolConfig = {
  title: 'sheets_delete_sheet',
  description: 'Delete a sheet from a Google Sheets spreadsheet',
  inputSchema: {
    spreadsheetId: z.string().describe('The ID of the spreadsheet (found in the URL after /d/)'),
    sheetId: z
      .number()
      .describe('The ID of the sheet to delete (use sheets_get_metadata to find sheet IDs)'),
  },
};

export async function handleDeleteSheet({
  spreadsheetId,
  sheetId,
}: {
  spreadsheetId: string;
  sheetId: number;
}) {
  try {
    const sheets = await getAuthenticatedClient();

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            deleteSheet: {
              sheetId,
            },
          },
        ],
      },
    });

    return formatSheetOperationResponse('Sheet deleted', {
      sheetId,
    });
  } catch (error) {
    return handleError(error);
  }
}
