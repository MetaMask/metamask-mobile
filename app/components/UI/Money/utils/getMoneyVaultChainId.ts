export const getMoneyVaultChainId = (
  vaultConfig: { chainId?: string } | null | undefined,
): number | undefined => {
  const configuredChainId = vaultConfig?.chainId;
  if (!configuredChainId) {
    return undefined;
  }

  const chainId = Number(configuredChainId);
  return Number.isSafeInteger(chainId) ? chainId : undefined;
};
