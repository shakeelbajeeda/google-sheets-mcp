import { ToolConfig } from '../types/tools.js';
import { getAuthenticatedClient } from '../utils/google-auth.js';
import { handleError } from '../utils/error-handler.js';
import { formatSheetOperationResponse } from '../utils/formatters.js';
import { z } from 'zod';

export const updateSheetPropertiesTool: ToolConfig = {
  title: 'sheets_update_sheet_properties',
  description: 'Update properties of a sheet in a Google Sheets spreadsheet',
  inputSchema: {
    spreadsheetId: z.string().describe('The ID of the spreadsheet (found in the URL after /d/)'),
    sheetId: z
      .number()
      .describe('The ID of the sheet to update (use sheets_get_metadata to find sheet IDs)'),
    title: z.string().optional().describe('New title for the sheet'),
    gridProperties: z
      .object({
        rowCount: z.number().optional().describe('Number of rows'),
        columnCount: z.number().optional().describe('Number of columns'),
        frozenRowCount: z.number().optional().describe('Number of frozen rows'),
        frozenColumnCount: z.number().optional().describe('Number of frozen columns'),
      })
      .optional()
      .describe('Grid properties to update'),
    tabColor: z
      .object({
        red: z.number().min(0).max(1).describe('Red component (0.0-1.0)'),
        green: z.number().min(0).max(1).describe('Green component (0.0-1.0)'),
        blue: z.number().min(0).max(1).describe('Blue component (0.0-1.0)'),
      })
      .optional()
      .describe('Tab color (RGB values from 0.0 to 1.0)'),
  },
};

export async function handleUpdateSheetProperties({
  spreadsheetId,
  sheetId,
  title,
  gridProperties,
  tabColor,
}: {
  spreadsheetId: string;
  sheetId: number;
  title?: string;
  gridProperties?: {
    rowCount?: number;
    columnCount?: number;
    frozenRowCount?: number;
    frozenColumnCount?: number;
  };
  tabColor?: {
    red: number;
    green: number;
    blue: number;
  };
}) {
  try {
    const sheets = await getAuthenticatedClient();

    const updateRequest: any = {
      properties: {
        sheetId,
      },
      fields: [],
    };

    if (title !== undefined) {
      updateRequest.properties.title = title;
      updateRequest.fields.push('title');
    }

    if (gridProperties) {
      updateRequest.properties.gridProperties = gridProperties;
      if (gridProperties.rowCount !== undefined) {
        updateRequest.fields.push('gridProperties.rowCount');
      }
      if (gridProperties.columnCount !== undefined) {
        updateRequest.fields.push('gridProperties.columnCount');
      }
      if (gridProperties.frozenRowCount !== undefined) {
        updateRequest.fields.push('gridProperties.frozenRowCount');
      }
      if (gridProperties.frozenColumnCount !== undefined) {
        updateRequest.fields.push('gridProperties.frozenColumnCount');
      }
    }

    if (tabColor) {
      updateRequest.properties.tabColor = tabColor;
      updateRequest.fields.push('tabColor');
    }

    if (updateRequest.fields.length === 0) {
      throw new Error('No properties to update');
    }

    updateRequest.fields = updateRequest.fields.join(',');

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            updateSheetProperties: updateRequest,
          },
        ],
      },
    });

    return formatSheetOperationResponse('Sheet properties updated', {
      sheetId,
      updatedFields: updateRequest.fields,
    });
  } catch (error) {
    return handleError(error);
  }
}
