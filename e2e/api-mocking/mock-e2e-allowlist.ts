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
  'testnet-rpc.monad.xyz',
  'virtual.linea.rpc.tenderly.co',
  'portfolio.dev-api.cx.metamask.io',
  'portfolio.uat-api.cx.metamask.io',
  'portfolio.api.cx.metamask.io',
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
  'https://min-api.cryptocompare.com/data/price?fsym=ETH&tsyms=POL',
  'https://min-api.cryptocompare.com/data/price?fsym=ETH&tsyms=FTM',
  'https://min-api.cryptocompare.com/data/price?fsym=ETH&tsyms=AVAX',
  'https://min-api.cryptocompare.com/data/price?fsym=ETH&tsyms=LINEAETH',
  'https://signature-insights.api.cx.metamask.io/v1/signature?chainId=0x539',
  'https://mainnet.era.zksync.io/',
  'https://eth.llamarpc.com/',
  'https://rpc.atlantischain.network/',
  'https://rewards.dev-api.cx.metamask.io/auth/mobile-login',
  'https://tx-sentinel-localhost.api.cx.metamask.io/',
  'https://nft.api.cx.metamask.io/collections?chainId=0x539&contract=0xb2552e4f4bc23e1572041677234d192774558bf0',
  'https://metamask.github.io/test-dapp/metamask-fox.svg',
  'https://dapp-scanning.api.cx.metamask.io/bulk-scan',
  'https://nft.api.cx.metamask.io/collections?contract=0xb66a603f4cfe17e3d27b87a8bfcad319856518b8&chainId=1',
  'https://nft.api.cx.metamask.io/users/0x76cf1cdd1fcc252442b50d6e97207228aa4aefc3/tokens?chainIds=1&limit=50&includeTopBid=true&continuation=',
  'https://bridge.dev-api.cx.metamask.io/getTokens?chainId=1',
  'https://client-config.api.cx.metamask.io/v1/flags?client=mobile&distribution=flask&environment=dev',
  'https://acl.execution.metamask.io/latest/registry.json',
  'https://acl.execution.metamask.io/latest/signature.json',
  'https://signature-insights.api.cx.metamask.io/v1/signature?chainId=0x1',
];
