import requestEthereumAccounts from '../eth-request-accounts';
import ethAccounts from '../eth_accounts';
import getProviderState from '../getProviderState';
// import logWeb3ShimUsage from '../logWeb3ShimUsage';
// import sendMetadata from '../sendMetadata';

export const eip1193OnlyHandlers = [ethAccounts, requestEthereumAccounts];

export const multichainLocalHandlers = [
  // TODO: [ffmcgee]Implement
  // FIXME: talk Jiexi.. wallet_watchAsset & wallet_addEthereumChain in here, but format is different between mobile & extension ({object param vs individual params})
  getProviderState,
  // logWeb3ShimUsage, // TODO: [ffmcgee] uncomment this one, implemented but lacking hooks (alertController) methods getWeb3ShimUsageState and setWeb3ShimUsageRecorded (see extension)
  // sendMetadata, // FIXME: [ffmcgee] wallet_createSession starts complaining about unsupported scopes when this is in
];
