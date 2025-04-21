import requestEthereumAccounts from '../eth-request-accounts';
import ethAccounts from '../eth_accounts';

export const eip1193OnlyHandlers = [ethAccounts, requestEthereumAccounts];

export const multichainLocalHandlers = [
  // TODO: [ffmcgee]Implement
  // FIXME: talk Jiexi.. wallet_watchAsset & wallet_addEthereumChain in here, but format is different between mobile & extension ({object param vs individual params})
  // getProviderState,
  // logWeb3ShimUsage,
  // sendMetadata,
];
