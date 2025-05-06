// eslint-disable-next-line import/no-nodejs-modules
import { Buffer } from 'buffer';
import { Duplex } from 'readable-stream';

// eslint-disable-next-line no-empty-function
const noop = () => {};

export default class PortDuplexStream extends Duplex {
  constructor(port, url) {
    super({
      objectMode: true,
    });
    this._port = port;
    this._url = url;
    // eslint-disable-next-line no-console
    console.log(`[METAMASK-DEBUG] MobilePortStream created for url: ${url}`);
    this._port.addListener('message', this._onMessage.bind(this));
    this._port.addListener('disconnect', this._onDisconnect.bind(this));
  }

  /**
   * Callback triggered when a message is received from
   * the remote Port associated with this Stream.
   *
   * @private
   * @param {Object} msg - Payload from the onMessage listener of Port
   */
  _onMessage = function (msg) {
    try {
      // Check if this is a JSON-RPC response message
      const isJsonRpcResponse = msg && 
                             typeof msg === 'object' && 
                             msg.name === 'metamask-provider' && 
                             msg.data && 
                             typeof msg.data === 'object' && 
                             msg.data.id !== undefined && 
                             (msg.data.result !== undefined || msg.data.error !== undefined);
      
      if (isJsonRpcResponse) {
        // eslint-disable-next-line no-console
        console.log(`[METAMASK-DEBUG] MobilePortStream._onMessage JSON-RPC RESPONSE:`, 
          JSON.stringify({
            name: msg.name,
            id: msg.data.id,
            hasResult: !!msg.data.result,
            hasError: !!msg.data.error
          }));
      } else {
        // eslint-disable-next-line no-console
        console.log(`[METAMASK-DEBUG] MobilePortStream._onMessage:`, 
          typeof msg === 'object' ? JSON.stringify(msg) : msg);
      }
      
      if (Buffer.isBuffer(msg)) {
        delete msg._isBuffer;
        const data = new Buffer(msg);
        // eslint-disable-next-line no-console
        console.log(`[METAMASK-DEBUG] MobilePortStream pushing buffer data`);
        this.push(data);
      } else {
        // eslint-disable-next-line no-console
        console.log(`[METAMASK-DEBUG] MobilePortStream pushing message data`);
        this.push(msg);
      }
    } catch (err) {
      console.error(`[METAMASK-DEBUG] Error in MobilePortStream._onMessage:`, err);
      this.emit('error', err);
    }
  };

  /**
   * Callback triggered when the remote Port
   * associated with this Stream disconnects.
   *
   * @private
   */
  _onDisconnect = function () {
    // eslint-disable-next-line no-console
    console.log(`[METAMASK-DEBUG] MobilePortStream disconnected`);
    this.end();
    this.destroy && this.destroy();
  };

  /**
   * Explicitly sets read operations to a no-op
   */
  _read = noop;

  /**
   * Called internally when data should be written to
   * this writable stream.
   *
   * @private
   * @param {*} msg Arbitrary object to write
   * @param {string} encoding Encoding to use when writing payload
   * @param {Function} cb Called when writing is complete or an error occurs
   */
  _write = function (msg, encoding, cb) {
    try {
      // Check if this is a JSON-RPC response being sent
      const isJsonRpcResponse = msg && 
                             typeof msg === 'object' && 
                             msg.name === 'metamask-provider' && 
                             msg.data && 
                             typeof msg.data === 'object' && 
                             msg.data.id !== undefined && 
                             (msg.data.result !== undefined || msg.data.error !== undefined);
      
      if (isJsonRpcResponse) {
        // eslint-disable-next-line no-console
        console.log(`[METAMASK-DEBUG] MobilePortStream._write JSON-RPC RESPONSE:`, 
          JSON.stringify({
            name: msg.name,
            id: msg.data.id,
            hasResult: !!msg.data.result,
            hasError: !!msg.data.error
          }));
          
        // Make sure toNative flag is cleared if present
        if (msg.data.toNative) {
          delete msg.data.toNative;
          // eslint-disable-next-line no-console
          console.log(`[METAMASK-DEBUG] MobilePortStream removed toNative flag from outgoing response`);
        }
      } else {
        // eslint-disable-next-line no-console
        console.log(`[METAMASK-DEBUG] MobilePortStream._write:`, 
          typeof msg === 'object' ? JSON.stringify(msg) : msg);
      }
      
      if (!this._port) {
        console.error(`[METAMASK-DEBUG] MobilePortStream._write error: this._port is undefined`);
        return cb(new Error('MobilePortStream - port is undefined'));
      }
        
      if (Buffer.isBuffer(msg)) {
        const data = msg.toJSON();
        data._isBuffer = true;
        // eslint-disable-next-line no-console
        console.log(`[METAMASK-DEBUG] MobilePortStream posting buffer message`);
        this._port.postMessage(data, this._url);
      } else {
        // eslint-disable-next-line no-console
        console.log(`[METAMASK-DEBUG] MobilePortStream posting regular message`);
        this._port.postMessage(msg, this._url);
      }
      cb();
    } catch (err) {
      console.error(`[METAMASK-DEBUG] Error in MobilePortStream._write:`, err);
      cb(new Error('PortDuplexStream - disconnected'));
    }
  };
}
