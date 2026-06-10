// mock expo auth session

export const useAuthRequest = jest.fn((config) => [
  {
    state: config?.state ?? 'mock-oauth-state',
    codeVerifier: 'mock-code-verifier',
  },
  null,
  jest.fn(),
]);

export const ResponseType = { Code: 'code' };

export const Prompt = { Consent: 'consent' };
