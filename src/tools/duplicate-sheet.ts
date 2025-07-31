import { ToolConfig } from '../types/tools.js';
import { getAuthenticatedClient } from '../utils/google-auth.js';
import { handleError } from '../utils/error-handler.js';
import { formatSheetOperationResponse } from '../utils/formatters.js';
import { z } from 'zod';

export const duplicateSheetTool: ToolConfig = {
  title: 'sheets_duplicate_sheet',
  description: 'Duplicate a sheet within a Google Sheets spreadsheet',
  inputSchema: {
    spreadsheetId: z.string().describe('The ID of the spreadsheet (found in the URL after /d/)'),
    sheetId: z
      .number()
      .describe('The ID of the sheet to duplicate (use sheets_get_metadata to find sheet IDs)'),
    insertSheetIndex: z
      .number()
      .optional()
      .describe('The index where the new sheet should be inserted (0-based)'),
    newSheetName: z.string().optional().describe('The name for the duplicated sheet'),
  },
};

export async function handleDuplicateSheet({
  spreadsheetId,
  sheetId,
  insertSheetIndex,
  newSheetName,
}: {
  spreadsheetId: string;
  sheetId: number;
  insertSheetIndex?: number;
  newSheetName?: string;
}) {
  try {
    const sheets = await getAuthenticatedClient();

    const response = await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            duplicateSheet: {
              sourceSheetId: sheetId,
              insertSheetIndex,
              newSheetName,
            },
          },
        ],
      },
    });

    const duplicatedSheet = response.data.replies?.[0]?.duplicateSheet
      ? response.data.replies[0].duplicateSheet.properties
      : undefined;
    return formatSheetOperationResponse('Sheet duplicated', {
      newSheetId: duplicatedSheet ? duplicatedSheet.sheetId : undefined,
      title: duplicatedSheet ? duplicatedSheet.title : undefined,
      index: duplicatedSheet ? duplicatedSheet.index : undefined,
    });
  } catch (error) {
    return handleError(error);
  }
}
