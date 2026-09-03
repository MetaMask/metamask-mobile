export const getAssetTestId = (token: string): string => `asset-${token}`;

const STAKED_ETHEREUM_SYMBOL = 'ETH';

export const WalletAssetSelectorsIDs = {
  STAKED_ETHEREUM: getAssetTestId(STAKED_ETHEREUM_SYMBOL),
} as const;
