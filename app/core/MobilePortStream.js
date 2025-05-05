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
      // eslint-disable-next-line no-console
      console.log(`[METAMASK-DEBUG] MobilePortStream._onMessage:`, 
        typeof msg === 'object' ? JSON.stringify(msg) : msg);
      
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
      // eslint-disable-next-line no-console
      console.log(`[METAMASK-DEBUG] MobilePortStream._write:`, 
        typeof msg === 'object' ? JSON.stringify(msg) : msg);
        
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
