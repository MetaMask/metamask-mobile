// Please do not add any more items to this list.
// This list is temporary and the goal is to reduce it to 0, meaning all requests are mocked in our e2e tests.

export const ALLOWLISTED_HOSTS = [
  '0.0.0.0',
  '127.0.0.1',
  'localhost',
  '10.0.2.2', // Android emulator host
  'api.tenderly.co',
  'rpc.tenderly.co',
  'virtual.mainnet.rpc.tenderly.co',
  '*.infura.io',
  'carrot.megaeth.com',
  'testnet-rpc.monad.xyz',
  'virtual.linea.rpc.tenderly.co',
];

export const ALLOWLISTED_URLS = [
  // Temporarily allow existing live requests during migration
  'https://client-config.api.cx.metamask.io/v1/flags?client=mobile&distribution=main&environment=dev',
  'https://clients3.google.com/generate_204',
  'https://api.avax.network/ext/bc/C/rpc',
  // Token SVGs in notifications list
  'https://raw.githubusercontent.com/MetaMask/contract-metadata/master/images/usdc.svg',
  'https://raw.githubusercontent.com/MetaMask/contract-metadata/master/images/shib.svg',
  'https://raw.githubusercontent.com/MetaMask/contract-metadata/master/images/usdt.svg',
  'https://token.api.cx.metamask.io/assets/nativeCurrencyLogos/ethereum.svg',
  'https://raw.githubusercontent.com/MetaMask/contract-metadata/master/images/stETH.svg',
  'https://raw.githubusercontent.com/MetaMask/contract-metadata/master/images/rETH.svg',
  'https://cdn.contentful.com:443/spaces/jdkgyfmyd9sw/environments/dev/entries?content_type=promotionalBanner&fields.showInMobile=true',
];
