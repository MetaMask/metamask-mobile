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
  console.log(`[METAMASK-DEBUG] InpageBridge MobilePortStream._onMessage: origin=${event.origin}`, 
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
  if (!msg.data || typeof msg.data !== 'object') {
    return;
  }
  if (msg.target && msg.target !== this._name) {
    return;
  }
  
  // Filter outgoing messages
  if (msg.data.data && msg.data.data.toNative) {
    console.log(`[METAMASK-DEBUG] InpageBridge MobilePortStream: ignoring outgoing message:`, msg.data.data);
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
    this.push(msg);
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
      // Special handling for SYN/ACK messages - these should be filtered out
      if (msg === 'SYN' || msg === 'ACK') {
        console.log(`[METAMASK-DEBUG] InpageBridge MobilePortStream: skipping direct SYN/ACK message`);
        return cb();
      }
      
      console.log(`[METAMASK-DEBUG] InpageBridge MobilePortStream: preparing regular payload, setting toNative=${!!msg.data}`);
      if (msg.data) {
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
