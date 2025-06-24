import requestEthereumAccounts from '../eth-request-accounts';
import ethAccounts from '../eth_accounts';
import getProviderState from '../getProviderState';

export const eip1193OnlyHandlers = [ethAccounts, requestEthereumAccounts];

export const multichainLocalHandlers = [
  getProviderState,
];
