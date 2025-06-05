const { initializeProvider, shimWeb3 } = require('@metamask/providers');
const ObjectMultiplex = require('@metamask/object-multiplex');
const pump = require('pump');
const { v4: uuid } = require('uuid');
const MobilePortStream = require('./MobilePortStream');
const ReactNativePostMessageStream = require('./ReactNativePostMessageStream');
const { pipeline } = require('readable-stream');

const INPAGE = 'metamask-inpage';
const CONTENT_SCRIPT = 'metamask-contentscript';
const PROVIDER = 'metamask-provider';
const MULTICHAIN_PROVIDER = 'metamask-multichain-provider';

// Debugging flag - set to true to enable comprehensive logging
const DEBUG_PROVIDER_INIT = true;

// Setup stream for content script communication
const metamaskStream = new ReactNativePostMessageStream({
  name: INPAGE,
  target: CONTENT_SCRIPT,
});

const init = () => {
  console.log(`[METAMASK-DEBUG] Provider init starting with Extension-Style Channel Stream architecture`);
  
  // EXTENSION-STYLE ARCHITECTURE: Create ObjectMultiplex at inpage level
  const mux = new ObjectMultiplex();
  pipeline(metamaskStream, mux, metamaskStream, (error) => {
    let warningMsg = `Lost connection to MetaMask provider.`;
    if (error?.stack) {
      warningMsg += `\n${error.stack}`;
    }
    console.warn(warningMsg);
  });
  
  console.log(`[METAMASK-DEBUG] Created ObjectMultiplex and pipeline - matching extension architecture`);
  
  // Provider info (same as before)
  const providerInfo = {
    uuid: uuid(),
    name: 'MetaMask',
    icon: 'https://raw.githubusercontent.com/MetaMask/brand-resources/master/SVG/metamask-fox.svg',
    rdns: 'io.metamask',
  };
  
  // EXTENSION PATTERN: Give provider its own dedicated channel stream
  console.log(`[METAMASK-DEBUG] Initializing provider with dedicated channel stream: ${PROVIDER}`);
  initializeProvider({
    connectionStream: mux.createStream(PROVIDER), // ✅ Channel stream like extension!
    logger: console,
    shouldSendMetadata: false,
    providerInfo,
  });
  
  // MULTICHAIN: Initialize second provider for multichain (like extension has separate handling)
  console.log(`[METAMASK-DEBUG] Initializing multichain provider with dedicated channel stream: ${MULTICHAIN_PROVIDER}`);
  initializeProvider({
    connectionStream: mux.createStream(MULTICHAIN_PROVIDER), // ✅ Second channel stream!
    logger: console,
    shouldSendMetadata: false,
    providerInfo,
  });
  
  console.log(`[METAMASK-DEBUG] Provider initialization completed - both channels setup`);
  
  // Setup content script streams (as before)
  setupProviderStreams();
  
  shimWeb3();
};

// Functions

/**
 * Setup function called from content script after the DOM is ready.
 */
function setupProviderStreams() {
  console.log(`[METAMASK-DEBUG] Setup provider streams completed`);
  
  const metamaskMobileProvider = new MobilePortStream('metamask-provider');
  const multichainProvider = new MobilePortStream('metamask-multichain-provider');
  const publicConfigStore = new MobilePortStream('publicConfig');
  const controllerUser = new MobilePortStream('controller');
  
  pump(
    metamaskMobileProvider,
    metamaskStream,
    metamaskMobileProvider,
    (err) => err && console.error(err)
  );
  
  pump(
    multichainProvider,
    metamaskStream,
    multichainProvider,
    (err) => err && console.error(err)
  );
  
  pump(
    publicConfigStore,
    metamaskStream,
    publicConfigStore,
    (err) => err && console.error(err)
  );
  
  pump(
    controllerUser,
    metamaskStream,
    controllerUser,
    (err) => err && console.error(err)
  );
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

export default init;
