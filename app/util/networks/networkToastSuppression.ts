const suppressedNetworkAddedToasts = new Set<string>();

const normalizeChainId = (chainId: string) => chainId.toLowerCase();

export const suppressNextNetworkAddedToast = (chainId: string) => {
  suppressedNetworkAddedToasts.add(normalizeChainId(chainId));
};

export const clearSuppressedNetworkAddedToast = (chainId: string) => {
  suppressedNetworkAddedToasts.delete(normalizeChainId(chainId));
};

/**
 * Atomically checks whether the next "network added" toast is suppressed for
 * this chain and clears that one-shot suppression entry.
 *
 * Returns `true` only when a matching suppression entry existed and was
 * removed. Returns `false` when `chainId` is missing or no entry was present.
 */
export const consumeSuppressedNetworkAddedToast = (chainId?: string) => {
  if (!chainId) {
    return false;
  }

  return suppressedNetworkAddedToasts.delete(normalizeChainId(chainId));
};

export const resetSuppressedNetworkAddedToasts = () => {
  suppressedNetworkAddedToasts.clear();
};
