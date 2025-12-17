import Authentication from './';

/**
 * Hook that interfaces with the Authentication service.
 */
export function useAuthentication() {
  return {
    lockApp: (options?: {
      allowRememberMe?: boolean;
      reset?: boolean;
      locked?: boolean;
      navigateToLogin?: boolean;
    }) => Authentication.lockApp(options),
  };
}
