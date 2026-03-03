const { getMultichainClient, getWindowPostMessageTransport } = require('@metamask/multichain-api-client');
const { registerBitcoinWalletStandard } = require('@metamask/bitcoin-wallet-standard');

const injectBitcoinWalletStandard = () => {
  console.log('injectBitcoinWalletStandard');
  const multichainClient = getMultichainClient({
    transport: getWindowPostMessageTransport(),
  });
  registerBitcoinWalletStandard({
    client: multichainClient,
    walletName: process.env.METAMASK_BUILD_NAME,
  });
};

export default injectBitcoinWalletStandard;