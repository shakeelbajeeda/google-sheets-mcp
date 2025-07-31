import { getAuthenticatedClient } from '../utils/google-auth.js';
import { handleError } from '../utils/error-handler.js';
import { formatToolResponse } from '../utils/formatters.js';
import { ToolConfig, ToolResponse } from '../types/tools.js';
import { z } from 'zod';

export const batchDeleteSheetsTool: ToolConfig = {
  title: 'sheets_batch_delete_sheets',
  description: 'Delete multiple sheets from a Google Sheets spreadsheet in a single operation',
  inputSchema: {
    spreadsheetId: z.string().describe('The ID of the spreadsheet (found in the URL after /d/)'),
    sheetIds: z
      .array(z.number())
      .describe('Array of sheet IDs to delete (use sheets_get_metadata to find sheet IDs)'),
  },
};

export async function handleBatchDeleteSheets({
  spreadsheetId,
  sheetIds,
}: {
  spreadsheetId: string;
  sheetIds: number[];
}): Promise<ToolResponse> {
  try {
    const sheets = await getAuthenticatedClient();

    // Build delete requests for each sheet
    const requests = sheetIds.map((sheetId) => ({
      deleteSheet: {
        sheetId: sheetId,
      },
    }));

    // Execute batch delete
    const response = await sheets.spreadsheets.batchUpdate({
      spreadsheetId: spreadsheetId,
      requestBody: {
        requests: requests,
      },
    });

    return formatToolResponse(`Successfully deleted ${sheetIds.length} sheets`, {
      spreadsheetId: response.data.spreadsheetId,
      deletedSheetIds: sheetIds,
      updatedReplies: response.data.replies || [],
    });
  } catch (error) {
    return handleError(error);
  }
}
