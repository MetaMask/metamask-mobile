export const getAssetTestId = (token: string) => `asset-${token}`;

const STAKED_ETHEREUM_SYMBOL = 'ETH';

export const WalletAssetSelectorsIDs = {
  STAKED_ETHEREUM: getAssetTestId(STAKED_ETHEREUM_SYMBOL),
} as const;

export const WalletAssetSelectorsText = {
  STAKED_ETHEREUM_AMOUNT: '1 ETH',
} as const;

export const WalletAssetSelectorsRegex = {
  FIAT_BALANCE: /^\$\d[\d,]*\.\d{2}$/,
} as const;
