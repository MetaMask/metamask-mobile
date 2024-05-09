/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable import/no-commonjs */
const VIEWS: Record<string, any> = {
  'MetaMask Default':
    require('../../../../../components/Views/Wallet/themes/01').default,
  'MetaMask NFTLover':
    require('../../../../../components/Views/Wallet/themes/02').default,
  'MetaMask web3Banking':
    require('../../../../../components/Views/Wallet/themes/03').default,
};

export default VIEWS;
