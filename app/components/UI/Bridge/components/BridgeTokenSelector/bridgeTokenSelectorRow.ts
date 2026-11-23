import type { BridgeToken } from '../../types';

export const getBridgeTokenSelectorRowKey = (
  item: BridgeToken | null,
  index: number,
): string => {
  if (!item) {
    return `skeleton-${index}`;
  }

  const tokenKey = `${item.chainId}-${item.address}`;
  return item.isMoneyToken ? `${tokenKey}-money` : tokenKey;
};

export const isBridgeTokenSelectorRowSelected = (
  selectedToken: BridgeToken | undefined,
  item: BridgeToken,
): boolean =>
  selectedToken?.address === item.address &&
  selectedToken?.chainId === item.chainId &&
  Boolean(selectedToken?.isMoneyToken) === Boolean(item.isMoneyToken);
