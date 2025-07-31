import { ToolConfig } from '../types/tools.js';
import { getAuthenticatedClient } from '../utils/google-auth.js';
import { handleError } from '../utils/error-handler.js';
import { formatSpreadsheetMetadata } from '../utils/formatters.js';
import { z } from 'zod';

export const getMetadataTool: ToolConfig = {
  title: 'sheets_get_metadata',
  description:
    'Get metadata about a Google Sheets spreadsheet including sheet names, IDs, and properties',
  inputSchema: {
    spreadsheetId: z.string().describe('The ID of the spreadsheet (found in the URL after /d/)'),
  },
};

export async function handleGetMetadata({ spreadsheetId }: { spreadsheetId: string }) {
  try {
    const sheets = await getAuthenticatedClient();

    const response = await sheets.spreadsheets.get({
      spreadsheetId,
      includeGridData: false,
    });

    return formatSpreadsheetMetadata(response.data);
  } catch (error) {
    return handleError(error);
  }
}
