import { sheets_v4 } from 'googleapis';
import { getAuthenticatedClient } from '../utils/google-auth.js';
import { handleError } from '../utils/error-handler.js';
import { formatToolResponse } from '../utils/formatters.js';
import { parseRange, getSheetId, extractSheetName } from '../utils/range-helpers.js';
import { parseJsonInput } from '../utils/json-parser.js';
import { ToolConfig, ToolResponse } from '../types/tools.js';
import { z } from 'zod';

export const batchFormatCellsTool: ToolConfig = {
  title: 'sheets_batch_format_cells',
  description: 'Format multiple cell ranges in a Google Sheet in a single operation',
  inputSchema: {
    spreadsheetId: z.string().describe('The ID of the spreadsheet (found in the URL after /d/)'),
    formatRequests: z
      .array(
        z.object({
          range: z.string().describe('Range to format in A1 notation (e.g., "Sheet1!A1:B10")'),
          format: z.object({}).describe('Cell format settings (colors, fonts, alignment, etc.)'),
        })
      )
      .describe('Array of format requests, each containing a range and format object'),
  },
};

export async function handleBatchFormatCells({
  spreadsheetId,
  formatRequests,
}: {
  spreadsheetId: string;
  formatRequests: Array<{
    range: string;
    format: object;
  }>;
}): Promise<ToolResponse> {
  try {
    // Handle JSON strings for format objects
    if (formatRequests && Array.isArray(formatRequests)) {
      formatRequests = formatRequests.map((request: any) => ({
        ...request,
        format: parseJsonInput(request.format, 'format'),
      }));
    }

    const sheets = await getAuthenticatedClient();

    // Build format requests
    const requests: sheets_v4.Schema$Request[] = [];

    for (const formatRequest of formatRequests) {
      // Extract sheet name and get sheet ID
      const { sheetName, range: cleanRange } = extractSheetName(formatRequest.range);
      const sheetId = await getSheetId(sheets, spreadsheetId, sheetName);

      // Parse range to GridRange
      const gridRange = parseRange(cleanRange, sheetId);

      // Build the cell format
      const cellFormat: sheets_v4.Schema$CellFormat = {};
      // @ts-ignore
      if (formatRequest.format.backgroundColor) {
        // @ts-ignore
        cellFormat.backgroundColor = formatRequest.format.backgroundColor;
      }
      // @ts-ignore
      if (formatRequest.format.textFormat) {
        const textFormat: any = {};
        // @ts-ignore
        const tf = formatRequest.format.textFormat;

        if (tf.foregroundColor !== undefined) {
          textFormat.foregroundColor = tf.foregroundColor;
        }
        if (tf.fontFamily !== undefined) {
          textFormat.fontFamily = tf.fontFamily;
        }
        if (tf.fontSize !== undefined) {
          textFormat.fontSize = tf.fontSize;
        }
        if (tf.bold !== undefined) {
          textFormat.bold = tf.bold;
        }
        if (tf.italic !== undefined) {
          textFormat.italic = tf.italic;
        }
        if (tf.strikethrough !== undefined) {
          textFormat.strikethrough = tf.strikethrough;
        }
        if (tf.underline !== undefined) {
          textFormat.underline = tf.underline;
        }

        cellFormat.textFormat = textFormat;
      }
      // @ts-ignore
      if (formatRequest.format.horizontalAlignment) {
        // @ts-ignore
        cellFormat.horizontalAlignment = formatRequest.format.horizontalAlignment;
      }

      // @ts-ignore
      if (formatRequest.format.verticalAlignment) {
        // @ts-ignore
        cellFormat.verticalAlignment = formatRequest.format.verticalAlignment;
      }

      // @ts-ignore
      if (formatRequest.format.wrapStrategy) {
        // @ts-ignore
        cellFormat.wrapStrategy = formatRequest.format.wrapStrategy;
      }

      // @ts-ignore
      if (formatRequest.format.numberFormat) {
        cellFormat.numberFormat = {
          // @ts-ignore
          type: formatRequest.format.numberFormat.type,
          // @ts-ignore
          pattern: formatRequest.format.numberFormat.pattern ?? null,
        };
      }

      // @ts-ignore
      if (formatRequest.format.padding) {
        // @ts-ignore
        cellFormat.padding = formatRequest.format.padding;
      }

      // Add the repeat cell request
      requests.push({
        repeatCell: {
          range: gridRange,
          cell: {
            userEnteredFormat: cellFormat,
          },
          fields: 'userEnteredFormat',
        },
      });
    }

    // Execute batch format
    const response = await sheets.spreadsheets.batchUpdate({
      spreadsheetId: spreadsheetId,
      requestBody: {
        requests: requests,
      },
    });

    return formatToolResponse(`Successfully formatted ${formatRequests.length} cell ranges`, {
      spreadsheetId: response.data.spreadsheetId,
      formattedRanges: formatRequests.map((r) => r.range),
      updatedReplies: response.data.replies || [],
    });
  } catch (error) {
    return handleError(error);
  }
}
