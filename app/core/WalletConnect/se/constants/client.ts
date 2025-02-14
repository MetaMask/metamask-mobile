export const PROTOCOL = 'wc';
export const PROTOCOL_VERSION = 2;
export const CLIENT_CONTEXT = 'SingleEthereum';

export const CLIENT_STORAGE_PREFIX = `${PROTOCOL}@${PROTOCOL_VERSION}:${CLIENT_CONTEXT}:`;

export const CLIENT_STORAGE_OPTIONS = {
  database: ':memory:',
};

export const EVM_IDENTIFIER = 'eip155';

export const SWITCH_CHAIN_METHODS = ['wallet_switchEthereumChain', 'wallet_addEthereumChain'];
