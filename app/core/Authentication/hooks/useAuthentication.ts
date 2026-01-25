import { Authentication } from '../Authentication';

/**
 * Hook that interfaces with the Authentication service.
 */
export function useAuthentication() {
  return {
    lockApp: Authentication.lockApp,
    reauthenticate: Authentication.reauthenticate,
    revealSRP: Authentication.revealSRP,
    revealPrivateKey: Authentication.revealPrivateKey,
  };
}

// Default export for backward compatibility
export default useAuthentication;
