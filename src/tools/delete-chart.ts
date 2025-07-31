import { getAuthenticatedClient } from '../utils/google-auth.js';
import { handleError } from '../utils/error-handler.js';
import { formatToolResponse } from '../utils/formatters.js';
import { ToolConfig, ToolResponse } from '../types/tools.js';
import { z } from 'zod';

export const deleteChartTool: ToolConfig = {
  title: 'sheets_delete_chart',
  description: 'Delete a chart from a Google Sheets spreadsheet',
  inputSchema: {
    spreadsheetId: z.string().describe('The ID of the spreadsheet (found in the URL after /d/)'),
    chartId: z
      .number()
      .describe('The ID of the chart to delete (use sheets_get_metadata to find chart IDs)'),
  },
};

export async function handleDeleteChart({
  spreadsheetId,
  chartId,
}: {
  spreadsheetId: string;
  chartId: number;
}): Promise<ToolResponse> {
  try {
    const sheets = await getAuthenticatedClient();

    // Delete the chart
    const response = await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [
          {
            deleteEmbeddedObject: {
              objectId: chartId,
            },
          },
        ],
      },
    });

    return formatToolResponse(`Successfully deleted chart ${chartId}`, {
      spreadsheetId: response.data.spreadsheetId,
      deletedChartId: chartId,
      updatedReplies: response.data.replies || [],
    });
  } catch (error) {
    return handleError(error);
  }
}
