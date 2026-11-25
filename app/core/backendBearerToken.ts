import Engine from './Engine';
import { isBackendAuthDisabled } from './coreBackendApiUrls';

/** Reads the shared backend bearer token without propagating auth errors. */
export async function getBackendBearerToken(): Promise<string | undefined> {
  if (isBackendAuthDisabled()) return undefined;
  try {
    return await Engine.context.AuthenticationController.getBearerToken();
  } catch {
    return undefined;
  }
}
