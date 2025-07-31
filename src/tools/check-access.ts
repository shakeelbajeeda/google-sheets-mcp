import { getAuthenticatedClient } from '../utils/google-auth.js';
import { handleError } from '../utils/error-handler.js';
import { ToolConfig } from '../types/tools';
import { z } from 'zod';
import { formatSuccessResponse } from '../utils/formatters';

export const checkAccessTool: ToolConfig = {
  title: 'sheets_check_access',
  description:
    'Check access permissions for a spreadsheet. Returns information about what operations are allowed.',
  inputSchema: {
    spreadsheetId: z.string().describe('The ID of the spreadsheet to check access for'),
  },
};

export async function handleCheckAccess({ spreadsheetId }: { spreadsheetId: string }) {
  try {
    const sheets = await getAuthenticatedClient();

    const permissions = {
      canRead: false,
      canWrite: false,
      canShare: false,
      isOwner: false,
      error: null as string | null,
    };

    try {
      // Try to read spreadsheet metadata
      const response = await sheets.spreadsheets.get({
        spreadsheetId,
        fields: 'properties.title,sheets.properties.sheetId,sheets.properties.title',
      });

      permissions.canRead = true;

      // Try to create a test request (but don't execute it) to check write permissions
      try {
        // Test write access by trying to prepare a values update
        await sheets.spreadsheets.values.update(
          {
            spreadsheetId,
            range: 'A1',
            valueInputOption: 'RAW',
            requestBody: {
              values: [['']],
            },
          },
          {
            // Use validateOnly to not actually write
            params: {
              validateOnly: true,
            },
          }
        );
        permissions.canWrite = true;
      } catch (writeError: any) {
        if (writeError.code === 403) {
          permissions.canWrite = false;
        } else if (writeError.code !== 400) {
          permissions.canWrite = true;
        }
      }

      return formatSuccessResponse(
        {
          spreadsheetId,
          title: response.data.properties?.title || 'Unknown',
          permissions,
          sheets:
            response.data.sheets?.map((sheet: any) => ({
              sheetId: sheet.properties?.sheetId,
              title: sheet.properties?.title,
            })) || [],
          recommendation: permissions.canWrite
            ? 'You have full read/write access to this spreadsheet.'
            : 'You have read-only access to this spreadsheet. To write data, the spreadsheet owner needs to grant you Editor permissions.',
        },
        'Success'
      );
    } catch (error: any) {
      if (error.code === 404) {
        permissions.error = 'Spreadsheet not found. Check if the ID is correct.';
      } else if (error.code === 403) {
        permissions.error =
          'Access denied. The spreadsheet needs to be shared with your service account.';
      } else {
        permissions.error = error.message || 'Unknown error occurred';
      }

      return formatSuccessResponse(
        {
          spreadsheetId,
          permissions,
          error: permissions.error,
          recommendation:
            'Share the spreadsheet with your service account email and grant appropriate permissions.',
        },
        'Share the spreadsheet with your service account email and grant appropriate permissions.'
      );
    }
  } catch (error) {
    return handleError(error);
  }
}
