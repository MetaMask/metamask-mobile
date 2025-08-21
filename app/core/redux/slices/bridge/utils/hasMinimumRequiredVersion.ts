export const hasMinimumRequiredVersion = (
  minRequiredVersion: string | undefined,
  isBridgeEnabled: boolean,
) => {
  if (!minRequiredVersion) return false;
  return isBridgeEnabled;
};
