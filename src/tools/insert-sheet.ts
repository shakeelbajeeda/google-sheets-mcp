import { ToolConfig } from '../types/tools.js';
import { getAuthenticatedClient } from '../utils/google-auth.js';
import { handleError } from '../utils/error-handler.js';
import { formatSheetOperationResponse } from '../utils/formatters.js';
import { z } from 'zod';

export const insertSheetTool: ToolConfig = {
  title: 'sheets_insert_sheet',
  description: 'Add a new sheet to an existing Google Sheets spreadsheet',
  inputSchema: {
    spreadsheetId: z.string().describe('The ID of the spreadsheet (found in the URL after /d/)'),
    title: z.string().describe('The title of the new sheet'),
    index: z.number().optional().describe('The index where the sheet should be inserted (0-based)'),
    rowCount: z.number().optional().describe('Number of rows in the sheet (default: 1000)'),
    columnCount: z.number().optional().describe('Number of columns in the sheet (default: 26)'),
  },
};

export async function handleInsertSheet({
  spreadsheetId,
  title,
  index,
  rowCount = 1000,
  columnCount = 26,
}: {
  spreadsheetId: string;
  title: string;
  index?: number;
  rowCount?: number;
  columnCount?: number;
}) {
  try {
    const sheets = await getAuthenticatedClient();

    const response = await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title,
                index,
                gridProperties: {
                  rowCount,
                  columnCount,
                },
              },
            },
          },
        ],
      },
    });

    const addedSheet = response.data.replies?.[0]?.addSheet
      ? response.data.replies[0].addSheet.properties
      : undefined;
    return formatSheetOperationResponse('Sheet inserted', {
      sheetId: addedSheet ? addedSheet.sheetId : undefined,
      title: addedSheet ? addedSheet.title : undefined,
      index: addedSheet ? addedSheet.index : undefined,
    });
  } catch (error) {
    return handleError(error);
  }
}
