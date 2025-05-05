const { initializeProvider, shimWeb3 } = require('@metamask/providers');
import ObjectMultiplex from '@metamask/object-multiplex';
import { pipeline } from 'readable-stream';
const { v4: uuid } = require('uuid');
const MobilePortStream = require('./MobilePortStream');
const ReactNativePostMessageStream = require('./ReactNativePostMessageStream');

const INPAGE = 'metamask-inpage';
const CONTENT_SCRIPT = 'metamask-contentscript';
// EIP-1193 provider channel name
const METAMASK_EIP_1193_PROVIDER = 'metamask-provider';

// Setup stream for content script communication
const metamaskStream = new ReactNativePostMessageStream({
  name: INPAGE,
  target: CONTENT_SCRIPT,
});

const init = () => {
  console.log(`[METAMASK-DEBUG] Provider init starting`);
  // Multiplex the raw stream and initialize provider on the EIP-1193 channel
  const mux = new ObjectMultiplex();
  pipeline(metamaskStream, mux, metamaskStream, (err) =>
    logStreamDisconnectWarning('MetaMask Inpage Multiplex', err),
  );
  
  // Create the provider engine
  const providerStream = mux.createStream(METAMASK_EIP_1193_PROVIDER);
  console.log(`[METAMASK-DEBUG] Provider created EIP-1193 provider stream`);
  
  // Initialize the provider
  initializeProvider({
    connectionStream: providerStream,
    shouldSendMetadata: false,
    providerInfo: {
      uuid: uuid(),
      name: process.env.METAMASK_BUILD_NAME,
      icon: process.env.METAMASK_BUILD_ICON,
      rdns: process.env.METAMASK_BUILD_APP_ID,
    },
  });
  
  console.log(`[METAMASK-DEBUG] Provider initialized`);

  // Set content script post-setup function
  Object.defineProperty(window, '_metamaskSetupProvider', {
    value: () => {
      setupProviderStreams();
      delete window._metamaskSetupProvider;
    },
    configurable: true,
    enumerable: false,
    writable: false,
  });
}

// Functions

/**
 * Setup function called from content script after the DOM is ready.
 */
function setupProviderStreams() {
  console.log(`[METAMASK-DEBUG] Setting up provider streams`);
  // the transport-specific streams for communication between inpage and background
  const pageStream = new ReactNativePostMessageStream({
    name: CONTENT_SCRIPT,
    target: INPAGE,
  });

  const appStream = new MobilePortStream({
    name: CONTENT_SCRIPT,
  });

  // create and connect channel muxes
  // so we can handle the channels individually
  const pageMux = new ObjectMultiplex();
  pageMux.setMaxListeners(25);
  const appMux = new ObjectMultiplex();
  appMux.setMaxListeners(25);

  pipeline(pageMux, pageStream, pageMux, (err) =>
    logStreamDisconnectWarning('MetaMask Inpage Multiplex', err),
  );
  pipeline(appMux, appStream, appMux, (err) => {
    logStreamDisconnectWarning('MetaMask Background Multiplex', err);
    notifyProviderOfStreamFailure();
  });

  // forward communication across inpage-background for the EIP-1193 provider channel
  console.log(`[METAMASK-DEBUG] Forwarding traffic for EIP-1193 provider channel`);
  forwardTrafficBetweenMuxes(METAMASK_EIP_1193_PROVIDER, pageMux, appMux);

  // add web3 shim
  shimWeb3(window.ethereum);
  console.log(`[METAMASK-DEBUG] Web3 shimmed`);
}

/**
 * Set up two-way communication between muxes for a single, named channel.
 *
 * @param {string} channelName - The name of the channel.
 * @param {ObjectMultiplex} muxA - The first mux.
 * @param {ObjectMultiplex} muxB - The second mux.
 */
function forwardTrafficBetweenMuxes(channelName, muxA, muxB) {
  const channelA = muxA.createStream(channelName);
  const channelB = muxB.createStream(channelName);
  pipeline(channelA, channelB, channelA, (err) =>
    logStreamDisconnectWarning(
      `MetaMask muxed traffic for channel "${channelName}" failed.`,
      err,
    ),
  );
}

/**
 * Error handler for page to extension stream disconnections
 *
 * @param {string} remoteLabel - Remote stream name
 * @param {Error} err - Stream connection error
 */
function logStreamDisconnectWarning(remoteLabel, err) {
  let warningMsg = `MetamaskContentscript - lost connection to ${remoteLabel}`;
  if (err) {
    warningMsg += `\n${err.stack}`;
  }
  console.warn(warningMsg);
  console.error(err);
}

/**
 * This function must ONLY be called in pump destruction/close callbacks.
 * Notifies the inpage context that streams have failed, via window.postMessage.
 * Relies on @metamask/object-multiplex and post-message-stream implementation details.
 */
function notifyProviderOfStreamFailure() {
  window.postMessage(
    {
      target: INPAGE, // the post-message-stream "target"
      data: {
        // this object gets passed to object-multiplex
        name: METAMASK_EIP_1193_PROVIDER, // the object-multiplex channel name
        data: {
          jsonrpc: '2.0',
          method: 'METAMASK_STREAM_FAILURE',
        },
      },
    },
    window.location.origin,
  );
}

export default init;
