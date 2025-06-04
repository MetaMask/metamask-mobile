const { getMultichainClient, getDefaultTransport } = require('@metamask/multichain-api-client');
const { registerSolanaWalletStandard } = require('@metamask/solana-wallet-standard');

const injectSolanaWalletStandard = () => {
  const multichainClient = getMultichainClient({
    transport: getDefaultTransport(),
  });
  registerSolanaWalletStandard({
    client: multichainClient,
    walletName: process.env.METAMASK_BUILD_NAME,
  });
};

export default injectSolanaWalletStandard;