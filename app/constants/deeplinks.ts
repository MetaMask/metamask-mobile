export enum ETH_ACTIONS {
  TRANSFER = 'transfer',
  APPROVE = 'approve',
}

export enum PROTOCOLS {
  HTTP = 'http',
  HTTPS = 'https',
  WC = 'wc',
  ETHEREUM = 'ethereum',
  DAPP = 'dapp',
  METAMASK = 'metamask',
}

export enum ACTIONS {
  DAPP = 'dapp',
  SEND = 'send',
  APPROVE = 'approve',
  PAYMENT = 'payment',
  FOCUS = 'focus',
  WC = 'wc',
  CONNECT = 'connect',
  MMSDK = 'mmsdk',
  ANDROID_SDK = 'bind',
  BUY = 'buy',
  BUY_CRYPTO = 'buy-crypto',
  SELL = 'sell',
  SELL_CRYPTO = 'sell-crypto',
  EMPTY = '',
}

export const PREFIXES = {
  [ACTIONS.DAPP]: 'https://',
  [ACTIONS.SEND]: 'ethereum:',
  [ACTIONS.APPROVE]: 'ethereum:',
  [ACTIONS.FOCUS]: '',
  [ACTIONS.EMPTY]: '',
  [ACTIONS.PAYMENT]: '',
  [ACTIONS.WC]: '',
  [ACTIONS.CONNECT]: '',
  [ACTIONS.ANDROID_SDK]: '',
  [ACTIONS.BUY]: '',
  [ACTIONS.SELL]: '',
  [ACTIONS.BUY_CRYPTO]: '',
  [ACTIONS.SELL_CRYPTO]: '',
  METAMASK: 'metamask://',
};
