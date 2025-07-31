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

const textFormatSchema = z
  .object({
    foregroundColor: colorSchema,
    fontFamily: z.string().optional(),
    fontSize: z.number().positive().optional(),
    bold: z.boolean().optional(),
    italic: z.boolean().optional(),
    strikethrough: z.boolean().optional(),
    underline: z.boolean().optional(),
  })
  .optional();

const numberFormatSchema = z
  .object({
    type: z.enum([
      'TEXT',
      'NUMBER',
      'PERCENT',
      'CURRENCY',
      'DATE',
      'TIME',
      'DATE_TIME',
      'SCIENTIFIC',
    ]),
    pattern: z.string().optional(),
  })
  .optional();

const cellFormatSchema = z.object({
  backgroundColor: colorSchema,
  textFormat: textFormatSchema,
  horizontalAlignment: z.enum(['LEFT', 'CENTER', 'RIGHT']).optional(),
  verticalAlignment: z.enum(['TOP', 'MIDDLE', 'BOTTOM']).optional(),
  wrapStrategy: z.enum(['OVERFLOW_CELL', 'LEGACY_WRAP', 'CLIP', 'WRAP']).optional(),
  numberFormat: numberFormatSchema,
  padding: z
    .object({
      top: z.number().optional(),
      right: z.number().optional(),
      bottom: z.number().optional(),
      left: z.number().optional(),
    })
    .optional(),
});

export const formatCellsTool: ToolConfig = {
  title: 'sheets_format_cells',
  description: 'Format cells in a Google Sheet (colors, fonts, alignment, number formats)',
  inputSchema: {
    spreadsheetId: z.string().describe('The ID of the spreadsheet (found in the URL after /d/)'),
    range: z.string().describe('The A1 notation range to format (e.g., "Sheet1!A1:B10")'),
    format: cellFormatSchema.describe('The format to apply to the cells'),
  },
};

export async function formatCellsHandler(input: any): Promise<ToolResponse> {
  try {
    // Handle case where format comes as JSON string (from Claude Desktop)
    input.format = parseJsonInput(input.format, 'format');

    const sheets = await getAuthenticatedClient();

    // Extract sheet name and get sheet ID
    const { sheetName, range: cleanRange } = extractSheetName(input.range);
    const sheetId = await getSheetId(sheets, input.spreadsheetId, sheetName);

    // Parse range to GridRange
    const gridRange = parseRange(cleanRange, sheetId);

    // Build the cell format
    const cellFormat: sheets_v4.Schema$CellFormat = {};

    if (input.format.backgroundColor) {
      cellFormat.backgroundColor = input.format.backgroundColor;
    }

    if (input.format.textFormat) {
      const textFormat: any = {};
      if (input.format.textFormat.foregroundColor !== undefined) {
        textFormat.foregroundColor = input.format.textFormat.foregroundColor;
      }
      if (input.format.textFormat.fontFamily !== undefined) {
        textFormat.fontFamily = input.format.textFormat.fontFamily;
      }
      if (input.format.textFormat.fontSize !== undefined) {
        textFormat.fontSize = input.format.textFormat.fontSize;
      }
      if (input.format.textFormat.bold !== undefined) {
        textFormat.bold = input.format.textFormat.bold;
      }
      if (input.format.textFormat.italic !== undefined) {
        textFormat.italic = input.format.textFormat.italic;
      }
      if (input.format.textFormat.strikethrough !== undefined) {
        textFormat.strikethrough = input.format.textFormat.strikethrough;
      }
      if (input.format.textFormat.underline !== undefined) {
        textFormat.underline = input.format.textFormat.underline;
      }
      cellFormat.textFormat = textFormat;
    }

    if (input.format.horizontalAlignment) {
      cellFormat.horizontalAlignment = input.format.horizontalAlignment;
    }

    if (input.format.verticalAlignment) {
      cellFormat.verticalAlignment = input.format.verticalAlignment;
    }

    if (input.format.wrapStrategy) {
      cellFormat.wrapStrategy = input.format.wrapStrategy;
    }

    if (input.format.numberFormat) {
      cellFormat.numberFormat = {
        type: input.format.numberFormat.type,
        pattern: input.format.numberFormat.pattern ?? null,
      };
    }

    if (input.format.padding) {
      cellFormat.padding = input.format.padding;
    }

    // Execute the format update
    const response = await sheets.spreadsheets.batchUpdate({
      spreadsheetId: input.spreadsheetId,
      requestBody: {
        requests: [
          {
            repeatCell: {
              range: gridRange,
              cell: {
                userEnteredFormat: cellFormat,
              },
              fields: 'userEnteredFormat',
            },
          },
        ],
      },
    });

    return formatToolResponse(`Successfully formatted cells in range ${input.range}`, {
      spreadsheetId: response.data.spreadsheetId,
      updatedReplies: response.data.replies || [],
    });
  } catch (error) {
    return handleError(error);
  }
}
