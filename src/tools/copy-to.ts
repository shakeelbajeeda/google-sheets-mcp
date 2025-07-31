import { getAuthenticatedClient } from '../utils/google-auth.js';
import { handleError } from '../utils/error-handler.js';
import { formatSheetOperationResponse } from '../utils/formatters.js';
import { ToolConfig } from '../types/tools';
import { z } from 'zod';

export const copyToTool: ToolConfig = {
  title: 'sheets_copy_to',
  description: 'Copy a sheet to another Google Sheets spreadsheet',
  inputSchema: {
    spreadsheetId: z
      .string()
      .describe('The ID of the source spreadsheet (found in the URL after /d/)'),
    sheetId: z
      .number()
      .describe('The ID of the sheet to copy (use sheets_get_metadata to find sheet IDs)'),
    destinationSpreadsheetId: z.string().describe('The ID of the destination spreadsheet'),
  },
};

export async function handleCopyTo({
  spreadsheetId,
  sheetId,
  destinationSpreadsheetId,
}: {
  spreadsheetId: string;
  sheetId: number;
  destinationSpreadsheetId: string;
}) {
  try {
    const sheets = await getAuthenticatedClient();

    const response = await sheets.spreadsheets.sheets.copyTo({
      spreadsheetId,
      sheetId,
      requestBody: {
        destinationSpreadsheetId,
      },
    });

    return formatSheetOperationResponse('Sheet copied', {
      destinationSheetId: response.data.sheetId,
      title: response.data.title,
    });
  } catch (error) {
    return handleError(error);
  }
}
