import Authentication from './';

/**
 * Hook that interfaces with the Authentication service.
 */
export function useAuthentication() {
  return {
    lockApp: Authentication.lockApp,
  };
}
