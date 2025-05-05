const { inherits } = require('util');
const { Duplex } = require('readable-stream');

const noop = () => undefined;

module.exports = MobilePortStream;

inherits(MobilePortStream, Duplex);

/**
 * Creates a stream that's both readable and writable.
 * The stream supports arbitrary objects.
 *
 * @class
 * @param {Object} port Remote Port object
 */
function MobilePortStream(port) {
  Duplex.call(this, {
    objectMode: true,
  });
  this._name = port.name;
  this._targetWindow = window;
  this._port = port;
  this._origin = location.origin;
  
  console.log(`[METAMASK-DEBUG] InpageBridge MobilePortStream created: name=${this._name}, origin=${this._origin}`);
  window.addEventListener('message', this._onMessage.bind(this), false);
}

/**
 * Callback triggered when a message is received from
 * the remote Port associated with this Stream.
 *
 * @private
 * @param {Object} msg - Payload from the onMessage listener of Port
 */
MobilePortStream.prototype._onMessage = function (event) {
  const msg = event.data;
  console.log(`[METAMASK-DEBUG] InpageBridge MobilePortStream._onMessage RAW: origin=${event.origin}`, 
    typeof msg === 'object' ? JSON.stringify(msg) : msg);

  // validate message
  if (this._origin !== '*' && event.origin !== this._origin) {
    console.warn(`[METAMASK-DEBUG] InpageBridge MobilePortStream: origin mismatch: expected=${this._origin}, got=${event.origin}`);
    return;
  }
  if (!msg || typeof msg !== 'object') {
    console.warn(`[METAMASK-DEBUG] InpageBridge MobilePortStream: invalid message format:`, msg);
    return;
  }
  
  // Filter out messages that appear to be echoes from our own postMessage calls
  // This prevents infinite loops but doesn't block legitimate requests
  if (event.source === window && // Message came from this window (likely our own postMessage)
      msg.origin && msg.origin.includes(window.location.href) && // Origin matches our current page
      msg.target && msg.data && msg.data.data && msg.data.data.toNative) {
    // Only filter out messages that match our outgoing message structure completely
    // AND don't have result/error properties (which would indicate it's a response)
    if (!(msg.data.data.result !== undefined || msg.data.data.error !== undefined)) {
      console.log(`[METAMASK-DEBUG] InpageBridge MobilePortStream: detected probable echo of outgoing postMessage, ignoring`);
      return;
    }
  }
  
  // Special handling for response messages which might be formatted differently
  if (msg.data && msg.data.result !== undefined) {
    console.log(`[METAMASK-DEBUG] InpageBridge MobilePortStream: detected response message with result:`, msg.data);
    // Directly pass the response to the stream
    if (msg.data.jsonrpc === '2.0' && msg.data.id) {
      const formattedResponse = {
        name: 'metamask-provider',
        data: msg.data
      };
      console.log(`[METAMASK-DEBUG] InpageBridge MobilePortStream: pushing JSON-RPC response:`, formattedResponse);
      this.push(formattedResponse);
      return;
    }
  }
  
  if (!msg.data || typeof msg.data !== 'object') {
    // Don't filter SYN/ACK messages, let them pass through
    console.log(`[METAMASK-DEBUG] InpageBridge MobilePortStream: received non-object data:`, msg.data);
  }
  
  // Check if this message belongs to this stream
  if (msg.target && msg.target !== this._name) {
    console.log(`[METAMASK-DEBUG] InpageBridge MobilePortStream: target mismatch - expected=${this._name}, got=${msg.target}`);
    return;
  }
  
  console.log(`[METAMASK-DEBUG] InpageBridge MobilePortStream: valid message received:`, 
    typeof msg === 'object' ? JSON.stringify(msg) : msg);

  if (Buffer.isBuffer(msg)) {
    console.log(`[METAMASK-DEBUG] InpageBridge MobilePortStream: processing buffer message`);
    delete msg._isBuffer;
    const data = Buffer.from(msg);
    this.push(data);
  } else {
    console.log(`[METAMASK-DEBUG] InpageBridge MobilePortStream: pushing regular message to stream`);
    
    // Transform the message structure to the format ObjectMultiplex expects
    // From: {target: "metamask-contentscript", data: {name: "metamask-provider", data: {...}}}
    // To:   {name: "metamask-provider", data: {...}}
    if (msg.data && msg.data.name && msg.data.data) {
      console.log(`[METAMASK-DEBUG] InpageBridge MobilePortStream: restructuring message for multiplex`);
      // Create a properly formatted object that ObjectMultiplex can process
      const formattedMsg = {
        name: msg.data.name,
        data: msg.data.data
      };
      console.log(`[METAMASK-DEBUG] InpageBridge MobilePortStream: pushing formatted message:`, 
        typeof formattedMsg === 'object' ? JSON.stringify(formattedMsg) : formattedMsg);
      this.push(formattedMsg);
    } else {
      // If the message doesn't match the expected structure, pass it through unchanged
      this.push(msg);
    }
  }
};

/**
 * Callback triggered when the remote Port
 * associated with this Stream disconnects.
 *
 * @private
 */
MobilePortStream.prototype._onDisconnect = function () {
  console.log(`[METAMASK-DEBUG] InpageBridge MobilePortStream._onDisconnect called`);
  this.destroy();
};

/**
 * Explicitly sets read operations to a no-op
 */
MobilePortStream.prototype._read = noop;

/**
 * Called internally when data should be written to
 * this writable stream.
 *
 * @private
 * @param {*} msg Arbitrary object to write
 * @param {string} encoding Encoding to use when writing payload
 * @param {Function} cb Called when writing is complete or an error occurs
 */
MobilePortStream.prototype._write = function (msg, _encoding, cb) {
  console.log(`[METAMASK-DEBUG] InpageBridge MobilePortStream._write:`, 
    typeof msg === 'object' ? JSON.stringify(msg) : msg);
  
  try {
    let payload;
    if (Buffer.isBuffer(msg)) {
      console.log(`[METAMASK-DEBUG] InpageBridge MobilePortStream: preparing buffer payload`);
      const data = msg.toJSON();
      data._isBuffer = true;
      payload = { target: this._name, data, origin: window.location.href };
    } else {
      // Don't filter SYN/ACK messages, let them pass through
      console.log(`[METAMASK-DEBUG] InpageBridge MobilePortStream: preparing regular payload, direction=outgoing`);
      // Mark message as outgoing to native layer
      if (msg !== 'SYN' && msg !== 'ACK' && typeof msg === 'object' && msg.data) {
        msg.data.toNative = true;
      }
      payload = { target: this._name, data: msg, origin: window.location.href };
    }
    
    console.log(`[METAMASK-DEBUG] InpageBridge MobilePortStream: sending to ReactNativeWebView:`, 
      typeof payload === 'object' ? JSON.stringify(payload) : payload);
    window.ReactNativeWebView.postMessage(JSON.stringify(payload));
  } catch (err) {
    console.error(`[METAMASK-DEBUG] InpageBridge MobilePortStream._write error:`, err);
    return cb(new Error('MobilePortStream - disconnected'));
  }
  return cb();
};
