import Authentication from './';

/**
 * Hook that interfaces with the Authentication service.
 */
export function useAuthentication() {
  return {
    lockApp: async (args: Parameters<typeof Authentication.lockApp>[0]) =>
      await Authentication.lockApp({
        ...args,
      }),
  };
}
