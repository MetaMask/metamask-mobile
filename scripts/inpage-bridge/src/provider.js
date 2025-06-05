const { initializeProvider, shimWeb3 } = require('@metamask/providers');
const ObjectMultiplex = require('@metamask/object-multiplex');
const pump = require('pump');
const { v4: uuid } = require('uuid');
const MobilePortStream = require('./MobilePortStream');
const ReactNativePostMessageStream = require('./ReactNativePostMessageStream');
const { Transform } = require('readable-stream');

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

// Create a transform stream to unwrap multiplexed messages for the raw provider
const createUnwrapTransform = () => {
  return new Transform({
    objectMode: true,
    transform(chunk, encoding, callback) {
      console.log(`[METAMASK-DEBUG] UnwrapTransform received:`, JSON.stringify(chunk));
      
      // If this is a multiplexed message with name + data, unwrap it
      if (chunk && typeof chunk === 'object' && chunk.name && chunk.data) {
        console.log(`[METAMASK-DEBUG] UnwrapTransform unwrapping multiplexed message from channel: ${chunk.name}`);
        this.push(chunk.data);
      } else {
        // Pass through non-multiplexed messages (like SYN/ACK)
        console.log(`[METAMASK-DEBUG] UnwrapTransform passing through raw message`);
        this.push(chunk);
      }
      callback();
    }
  });
};

const init = () => {
  console.log(`[METAMASK-DEBUG] Provider init starting`);
  
  const providerInfo = {
    uuid: uuid(),
    name: process.env.METAMASK_BUILD_NAME,
    icon: process.env.METAMASK_BUILD_ICON,
    rdns: process.env.METAMASK_BUILD_APP_ID,
  };
  
  console.log(`[METAMASK-DEBUG] Provider info:`, JSON.stringify(providerInfo));

  // FIXED APPROACH: Raw Stream + Unwrap Transform
  // Create transform to unwrap multiplexed messages
  const unwrapTransform = createUnwrapTransform();
  
  // Connect transform between metamaskStream and provider
  pump(metamaskStream, unwrapTransform, (err) => {
    if (err) console.log(`[METAMASK-DEBUG] Unwrap transform error:`, err);
  });
  
  console.log(`[METAMASK-DEBUG] Using raw stream with unwrap transform - provider gets pure JSON-RPC`);

  // Initialize the provider with UNWRAPPED stream
  const provider = initializeProvider({
    connectionStream: unwrapTransform, // Unwrapped stream - pure JSON-RPC
    shouldSendMetadata: false,
    providerInfo,
  });

  console.log(`[METAMASK-DEBUG] Provider initialized with unwrapped stream - receives pure JSON-RPC messages`);

  // Set content script post-setup function
  Object.defineProperty(window, '_metamaskSetupProvider', {
    value: () => {
      console.log(`[METAMASK-DEBUG] setupProviderStreams called`);
      setupProviderStreams();
      delete window._metamaskSetupProvider;
    },
    configurable: true,
    enumerable: false,
    writable: false,
  });
};

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

  pump(pageMux, pageStream, pageMux, (err) => {
    logStreamDisconnectWarning('MetaMask Inpage Multiplex', err);
  });
  pump(appMux, appStream, appMux, (err) => {
    logStreamDisconnectWarning('MetaMask Background Multiplex', err);
    notifyProviderOfStreamFailure();
  });

  // forward communication across inpage-background for these channels only
  forwardTrafficBetweenMuxes(PROVIDER, pageMux, appMux);
  forwardTrafficBetweenMuxes(MULTICHAIN_PROVIDER, pageMux, appMux);

  // add web3 shim
  shimWeb3(window.ethereum);
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
  pump(channelA, channelB, channelA, (err) => {
    logStreamDisconnectWarning(
      `MetaMask muxed traffic for channel "${channelName}" failed.`,
      err,
    );
  });
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
        name: PROVIDER, // the object-multiplex channel name
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
