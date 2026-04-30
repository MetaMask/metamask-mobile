export const pinKeys = {
  all: () => ['card', 'pin'] as const,
  token: () => [...pinKeys.all(), 'token'] as const,
};
