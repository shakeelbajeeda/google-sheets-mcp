import { getAuthenticatedClient } from '../utils/google-auth.js';
import { handleError } from '../utils/error-handler.js';
import { formatSpreadsheetCreatedResponse } from '../utils/formatters.js';
import { ToolConfig } from '../types/tools';
import { z } from 'zod';

const sheetSchema = z.object({
  title: z.string().describe('The title of the sheet'),
  rowCount: z
    .number()
    .positive()
    .optional()
    .describe('Number of rows in the sheet (default: 1000)'),
  columnCount: z
    .number()
    .positive()
    .optional()
    .describe('Number of columns in the sheet (default: 26)'),
});

const createSpreadsheetSchema = {
  title: z.string().describe('The title of the new spreadsheet'),
  sheets: z.array(sheetSchema).optional().describe('Array of sheets to create in the spreadsheet'),
};

export const createSpreadsheetTool: ToolConfig = {
  title: 'sheets_create_spreadsheet',
  description: 'Create a new Google Sheets spreadsheet',
  inputSchema: createSpreadsheetSchema,
};

export async function handleCreateSpreadsheet(input: any) {
  try {
    const sheets = await getAuthenticatedClient();

    const requestBody: any = {
      properties: {
        title: input.title,
      },
    };

    if (input.sheets && input.sheets.length > 0) {
      requestBody.sheets = input.sheets.map((sheet: any, index: number) => ({
        properties: {
          title: sheet.title || `Sheet${index + 1}`,
          gridProperties: {
            rowCount: sheet.rowCount || 1000,
            columnCount: sheet.columnCount || 26,
          },
        },
      }));
    }

    const response = await sheets.spreadsheets.create({
      requestBody,
    });

    return formatSpreadsheetCreatedResponse(response.data);
  } catch (error) {
    return handleError(error);
  }
}
