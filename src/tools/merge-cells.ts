import { ToolConfig } from '../types/tools.js';
import { z } from 'zod';
import { getAuthenticatedClient } from '../utils/google-auth.js';
import { handleError } from '../utils/error-handler.js';
import { formatToolResponse } from '../utils/formatters.js';
import { ToolResponse } from '../types/tools.js';
import { parseRange, getSheetId, extractSheetName } from '../utils/range-helpers.js';

export const mergeCellsTool: ToolConfig = {
  title: 'sheets_merge_cells',
  description: 'Merge cells in a Google Sheet',
  inputSchema: {
    spreadsheetId: z.string().describe('The ID of the spreadsheet (found in the URL after /d/)'),
    range: z.string().describe('The A1 notation range to merge (e.g., "Sheet1!A1:B10")'),
    mergeType: z
      .enum(['MERGE_ALL', 'MERGE_COLUMNS', 'MERGE_ROWS'])
      .describe('The type of merge to perform'),
  },
};

export const unmergeCellsTool: ToolConfig = {
  title: 'sheets_unmerge_cells',
  description: 'Unmerge cells in a Google Sheet',
  inputSchema: {
    spreadsheetId: z.string().describe('The ID of the spreadsheet (found in the URL after /d/)'),
    range: z.string().describe('The A1 notation range to unmerge (e.g., "Sheet1!A1:B10")'),
  },
};

export async function mergeCellsHandler(input: any): Promise<ToolResponse> {
  try {
    const sheets = await getAuthenticatedClient();

    // Extract sheet name and get sheet ID
    const { sheetName, range: cleanRange } = extractSheetName(input.range);
    const sheetId = await getSheetId(sheets, input.spreadsheetId, sheetName);

    // Parse range to GridRange
    const gridRange = parseRange(cleanRange, sheetId);

    // Execute the merge
    const response = await sheets.spreadsheets.batchUpdate({
      spreadsheetId: input.spreadsheetId,
      requestBody: {
        requests: [
          {
            mergeCells: {
              range: gridRange,
              mergeType: input.mergeType,
            },
          },
        ],
      },
    });

    return formatToolResponse(
      `Successfully merged cells in range ${input.range} with merge type ${input.mergeType}`,
      {
        spreadsheetId: response.data.spreadsheetId,
      }
    );
  } catch (error) {
    return handleError(error);
  }
}

export async function unmergeCellsHandler(input: any): Promise<ToolResponse> {
  try {
    const sheets = await getAuthenticatedClient();

    // Extract sheet name and get sheet ID
    const { sheetName, range: cleanRange } = extractSheetName(input.range);
    const sheetId = await getSheetId(sheets, input.spreadsheetId, sheetName);

    // Parse range to GridRange
    const gridRange = parseRange(cleanRange, sheetId);

    const response = await sheets.spreadsheets.batchUpdate({
      spreadsheetId: input.spreadsheetId,
      requestBody: {
        requests: [
          {
            unmergeCells: {
              range: gridRange,
            },
          },
        ],
      },
    });

    return formatToolResponse(`Successfully unmerged cells in range ${input.range}`, {
      spreadsheetId: response.data.spreadsheetId,
    });
  } catch (error) {
    return handleError(error);
  }
}
