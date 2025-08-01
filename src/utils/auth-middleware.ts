import { Request, Response, NextFunction } from 'express';
import { setRequestContextValue } from './requestContext.js';
import { validateAuth } from './google-auth.js';

/**
 * Middleware to authenticate requests using service account key from authorization header
 * @param req Express request object
 * @param res Express response object
 * @param next Express next function
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    // Check if authorization header exists
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader) {
      return res.status(401).json({
        error: 'Authorization header is required',
        message: 'Please provide the service account key in the Authorization header',
      });
    }

    // Extract the service account key from the authorization header
    // @ts-ignore Expected format: "Bearer <service_account_json_string>"
    const authParts = authHeader.split(' ');
    if (authParts.length !== 2 || authParts[0] !== 'Bearer') {
      return res.status(401).json({
        error: 'Invalid authorization format',
        message: 'Authorization header must be in format: Bearer <service_account_json_string>',
      });
    }

    const serviceAccountKey = authParts[1];

    // Validate the service account key
    try {
      const jsonString = Buffer.from(serviceAccountKey, 'base64').toString('utf-8');
      const credentials = JSON.parse(jsonString);

      // Store the service account key in request context
      setRequestContextValue('googleServiceAccountCredentials', credentials);

      // Call validateAuth to ensure authentication is properly configured
      validateAuth();

      return next();
    } catch (parseError) {
      console.log(parseError);
      return res.status(401).json({
        error: 'Invalid service account key',
        message: 'The provided service account key is not valid JSON',
      });
    }
  } catch (error) {
    return res.status(500).json({
      error: 'Authentication failed',
      message: 'An error occurred during authentication',
    });
  }
}
