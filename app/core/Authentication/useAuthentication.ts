import Authentication from './';

/**
 * Hook that interfaces with the Authentication service.
 */
export function useAuthentication() {
  return {
    turnOffRememberMeAndLockApp: Authentication.lockApp({
      allowRememberMe: false,
    }),
  };
}
