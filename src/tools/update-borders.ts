import { ToolConfig } from '../types/tools.js';
import { z } from 'zod';
import { sheets_v4 } from 'googleapis';
import { getAuthenticatedClient } from '../utils/google-auth.js';
import { handleError } from '../utils/error-handler.js';
import { formatToolResponse } from '../utils/formatters.js';
import { ToolResponse } from '../types/tools.js';
import { parseRange, getSheetId, extractSheetName } from '../utils/range-helpers.js';
import { parseJsonInput } from '../utils/json-parser.js';

// Schema definitions
const colorSchema = z
  .object({
    red: z.number().min(0).max(1).optional(),
    green: z.number().min(0).max(1).optional(),
    blue: z.number().min(0).max(1).optional(),
    alpha: z.number().min(0).max(1).optional(),
  })
  .optional();

const borderSchema = z
  .object({
    style: z.enum(['NONE', 'SOLID', 'DASHED', 'DOTTED', 'SOLID_MEDIUM', 'SOLID_THICK', 'DOUBLE']),
    color: colorSchema,
    width: z.number().positive().optional(),
  })
  .optional();

const bordersSchema = z.object({
  top: borderSchema,
  bottom: borderSchema,
  left: borderSchema,
  right: borderSchema,
  innerHorizontal: borderSchema,
  innerVertical: borderSchema,
});

export const updateBordersTool: ToolConfig = {
  title: 'sheets_update_borders',
  description: 'Update borders of cells in a Google Sheet',
  inputSchema: {
    spreadsheetId: z.string().describe('The ID of the spreadsheet (found in the URL after /d/)'),
    range: z
      .string()
      .describe('The A1 notation range to update borders for (e.g., "Sheet1!A1:B10")'),
    borders: bordersSchema.describe('The border configuration to apply'),
  },
};

export async function updateBordersHandler(input: any): Promise<ToolResponse> {
  try {
    // Handle case where borders comes as JSON string
    input.borders = parseJsonInput(input.borders, 'borders');

    const sheets = await getAuthenticatedClient();

    // Extract sheet name and get sheet ID
    const { sheetName, range: cleanRange } = extractSheetName(input.range);
    const sheetId = await getSheetId(sheets, input.spreadsheetId, sheetName);

    // Parse range to GridRange
    const gridRange = parseRange(cleanRange, sheetId);

    // Build the border update request
    const updateBordersRequest: sheets_v4.Schema$UpdateBordersRequest = {
      range: gridRange,
    };

    // Helper function to convert our border format to Google's format
    const convertBorder = (border?: any): sheets_v4.Schema$Border | undefined => {
      if (!border) {
        return undefined;
      }
      return {
        style: border.style,
        color: border.color,
        width: border.width,
      };
    };

    const topBorder = convertBorder(input.borders.top);
    if (topBorder) {
      updateBordersRequest.top = topBorder;
    }

    const bottomBorder = convertBorder(input.borders.bottom);
    if (bottomBorder) {
      updateBordersRequest.bottom = bottomBorder;
    }

    const leftBorder = convertBorder(input.borders.left);
    if (leftBorder) {
      updateBordersRequest.left = leftBorder;
    }

    const rightBorder = convertBorder(input.borders.right);
    if (rightBorder) {
      updateBordersRequest.right = rightBorder;
    }

    const innerHorizontalBorder = convertBorder(input.borders.innerHorizontal);
    if (innerHorizontalBorder) {
      updateBordersRequest.innerHorizontal = innerHorizontalBorder;
    }

    const innerVerticalBorder = convertBorder(input.borders.innerVertical);
    if (innerVerticalBorder) {
      updateBordersRequest.innerVertical = innerVerticalBorder;
    }

    // Execute the border update
    const response = await sheets.spreadsheets.batchUpdate({
      spreadsheetId: input.spreadsheetId,
      requestBody: {
        requests: [
          {
            updateBorders: updateBordersRequest,
          },
        ],
      },
    });

    return formatToolResponse(`Successfully updated borders for range ${input.range}`, {
      spreadsheetId: response.data.spreadsheetId,
    });
  } catch (error) {
    return handleError(error);
  }
}
