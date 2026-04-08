export const authKeys = {
  all: () => ['card', 'auth'] as const,
  initiate: () => [...authKeys.all(), 'initiate'] as const,
  submit: () => [...authKeys.all(), 'submit'] as const,
  stepAction: () => [...authKeys.all(), 'step-action'] as const,
  logout: () => [...authKeys.all(), 'logout'] as const,
};
