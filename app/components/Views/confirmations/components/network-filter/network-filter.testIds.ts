export const NETWORK_FILTER_ALL_TEST_ID = 'transaction-pay-network-filter-all';

export const getNetworkFilterTestId = (chainId: string): string =>
  `transaction-pay-network-filter-${chainId}`;

export const getNetworkFilterAvatarTestId = (chainId: string): string =>
  `transaction-pay-network-filter-avatar-${chainId}`;
