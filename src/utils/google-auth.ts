import { google } from 'googleapis';
import { JWT } from 'google-auth-library';
import { GOOGLE_SHEETS_SCOPES } from '../config/constants.js';
import { getGoogleServiceAccountKey } from './requestContext';

/**
 * Validate and extract service account JSON from string
 */
export function validateAuth(): { credentials: any; projectId: string } {
  try {
    // @ts-ignore
    const credentials = getGoogleServiceAccountKey();

    if (!credentials) {
      throw Error('Invalid service account');
    }
    // @ts-ignore
    if (!credentials.type || credentials.type !== 'service_account') {
      throw new Error('Invalid service account: type must be "service_account"');
    }

    // @ts-ignore
    if (!credentials.private_key) {
      throw new Error('Invalid service account: missing private_key');
    }

    // @ts-ignore
    if (!credentials.client_email) {
      throw new Error('Invalid service account: missing client_email');
    }

    // @ts-ignore
    if (!credentials.project_id) {
      throw new Error('Invalid service account: missing project_id');
    }

    return {
      credentials,
      // @ts-ignore
      projectId: credentials.project_id,
    };
  } catch (error: any) {
    if (error instanceof SyntaxError) {
      throw new Error(
        'GOOGLE_SERVICE_ACCOUNT_KEY contains invalid JSON. ' +
          'Please ensure it is a valid JSON string.'
      );
    }
    throw error;
  }
}

/**
 * Create a GoogleAuth client using a user-specific service account JSON string
 */
export async function getAuthClient(): Promise<JWT> {
  const { credentials } = validateAuth();

  const jwtClient = new JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: GOOGLE_SHEETS_SCOPES,
  });

  // Optional: Force a token request (to verify auth)
  await jwtClient.authorize(); // this generates and sets the access token

  return jwtClient;
}

/**
 * Returns a Sheets client for a specific user's service account
 * and forces token refresh for each request
 */
export async function getAuthenticatedClient() {
  const jwtClient = await getAuthClient();

  const sheetsClient = google.sheets({
    version: 'v4',
    auth: jwtClient,
  });

  return sheetsClient;
}

// import { google } from 'googleapis';
// import { GoogleAuth } from 'google-auth-library';
// import { GOOGLE_SHEETS_SCOPES } from '../config/constants.js';
//
// let authClient: GoogleAuth | null = null;
// let sheetsClient: any = null;
//
// export async function getAuthClient(): Promise<GoogleAuth> {
//   if (!authClient) {
//     const options: any = {
//       scopes: GOOGLE_SHEETS_SCOPES,
//     };
//
//     if (process.env.GOOGLE_PROJECT_ID) {
//       options.projectId = process.env.GOOGLE_PROJECT_ID;
//     }
//
//     // Priority 1: Use file-based authentication if available
//     if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
//       options.keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
//     }
//     // Priority 2: Use JSON string authentication as fallback
//     else if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
//       try {
//         const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
//         options.credentials = credentials;
//
//         // Extract project ID from credentials if not explicitly set
//         if (!options.projectId && credentials.project_id) {
//           options.projectId = credentials.project_id;
//         }
//       } catch (error) {
//         throw new Error(
//           'Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY: Invalid JSON format. ' +
//             'Please ensure the environment variable contains valid JSON.'
//         );
//       }
//     }
//
//     authClient = new GoogleAuth(options);
//   }
//   return authClient;
// }
//
// export async function getAuthenticatedClient() {
//   if (!sheetsClient) {
//     const auth = await getAuthClient();
//     const authClient = await auth.getClient();
//
//     sheetsClient = google.sheets({
//       version: 'v4',
//       auth: authClient as any,
//     });
//   }
//
//   return sheetsClient;
// }
//
// export function validateAuth(): void {
//   // Check if at least one authentication method is provided
//   if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
//     throw new Error(
//       'No authentication method provided. Please set either:\n' +
//         '- GOOGLE_APPLICATION_CREDENTIALS to the path of your service account key file, or\n' +
//         '- GOOGLE_SERVICE_ACCOUNT_KEY to the JSON string of your service account credentials.'
//     );
//   }
//
//   // If using JSON authentication, validate it can be parsed
//   if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
//     try {
//       const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
//
//       // Validate required fields in the service account JSON
//       if (!credentials.type || credentials.type !== 'service_account') {
//         throw new Error('Invalid service account: type must be "service_account"');
//       }
//       if (!credentials.private_key) {
//         throw new Error('Invalid service account: missing private_key');
//       }
//       if (!credentials.client_email) {
//         throw new Error('Invalid service account: missing client_email');
//       }
//
//       // Extract project ID from credentials if GOOGLE_PROJECT_ID is not set
//       if (!process.env.GOOGLE_PROJECT_ID && credentials.project_id) {
//         process.env.GOOGLE_PROJECT_ID = credentials.project_id;
//       }
//     } catch (error: any) {
//       if (error instanceof SyntaxError) {
//         throw new Error(
//           'GOOGLE_SERVICE_ACCOUNT_KEY contains invalid JSON. ' +
//             'Please ensure it is a valid JSON string.'
//         );
//       }
//       throw error;
//     }
//   }
//
//   // Validate project ID is available
//   if (!process.env.GOOGLE_PROJECT_ID) {
//     throw new Error(
//       'GOOGLE_PROJECT_ID environment variable is not set. ' +
//         'Please set it to your Google Cloud project ID, or ensure it is included in your service account credentials.'
//     );
//   }
// }
