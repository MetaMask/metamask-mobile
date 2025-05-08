export const MIN_IN_MS = 1000 * 60;
export const HOUR_IN_MS = MIN_IN_MS * 60;
export const DAY_IN_MS = HOUR_IN_MS * 24;
export const DEFAULT_SESSION_TIMEOUT_MS = 30 * DAY_IN_MS;

export const TIMEOUT_PAUSE_CONNECTIONS = 25000;

export const RPC_METHODS = {
  METAMASK_GETPROVIDERSTATE: 'metamask_getProviderState',
  METAMASK_CONNECTSIGN: 'metamask_connectSign',
  METAMASK_CONNECTWITH: 'metamask_connectWith',
  METAMASK_OPEN: 'metamask_open',
  METAMASK_BATCH: 'metamask_batch',
  PERSONAL_SIGN: 'personal_sign',
  ETH_REQUESTACCOUNTS: 'eth_requestAccounts',
  ETH_SENDTRANSACTION: 'eth_sendTransaction',
  ETH_SIGNTRANSACTION: 'eth_signTransaction',
  ETH_SIGNTYPEDEATA: 'eth_signTypedData',
  ETH_SIGNTYPEDEATAV3: 'eth_signTypedData_v3',
  ETH_SIGNTYPEDEATAV4: 'eth_signTypedData_v4',
  WALLET_WATCHASSET: 'wallet_watchAsset',
  WALLET_ADDETHEREUMCHAIN: 'wallet_addEthereumChain',
  WALLET_SWITCHETHEREUMCHAIN: 'wallet_switchEthereumChain',
  WALLET_REQUESTPERMISSIONS: 'wallet_requestPermissions',
  WALLET_GETPERMISSIONS: 'wallet_getPermissions',
  WALLET_REVOKEPERMISSIONS: 'wallet_revokePermissions',
  ETH_ACCOUNTS: 'eth_accounts',
  ETH_CHAINID: 'eth_chainId',
};
export const CONNECTION_LOADING_EVENT = 'loading';

export const METHODS_TO_REDIRECT: { [method: string]: boolean } = {
  [RPC_METHODS.ETH_REQUESTACCOUNTS]: true,
  [RPC_METHODS.ETH_SENDTRANSACTION]: true,
  [RPC_METHODS.ETH_SIGNTRANSACTION]: true,
  [RPC_METHODS.PERSONAL_SIGN]: true,
  [RPC_METHODS.ETH_SIGNTRANSACTION]: true,
  [RPC_METHODS.ETH_SIGNTYPEDEATAV3]: true,
  [RPC_METHODS.ETH_SIGNTYPEDEATAV4]: true,
  [RPC_METHODS.WALLET_WATCHASSET]: true,
  [RPC_METHODS.WALLET_ADDETHEREUMCHAIN]: true,
  [RPC_METHODS.WALLET_SWITCHETHEREUMCHAIN]: true,
  [RPC_METHODS.WALLET_REQUESTPERMISSIONS]: true,
  [RPC_METHODS.WALLET_GETPERMISSIONS]: true,
  [RPC_METHODS.WALLET_REVOKEPERMISSIONS]: true,
  [RPC_METHODS.METAMASK_CONNECTSIGN]: true,
  [RPC_METHODS.METAMASK_BATCH]: true,
};

export const METHODS_TO_DELAY: { [method: string]: boolean } = {
  ...METHODS_TO_REDIRECT,
  [RPC_METHODS.ETH_REQUESTACCOUNTS]: false,
};
