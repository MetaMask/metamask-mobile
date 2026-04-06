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
    if (Buffer.isBuffer(msg)) {
      delete msg._isBuffer;
      const data = new Buffer(msg);
      this.push(data);
    } else {
      this.push(msg);
    }
  };

  /**
   * Callback triggered when the remote Port
   * associated with this Stream disconnects.
   *
   * @private
   */
  _onDisconnect = function () {
    // Push null to signal readable end-of-stream, then end the writable side.
    // This sets _readableState.ended and _writableState.ended before the
    // 'close' event fires, preventing ERR_STREAM_PREMATURE_CLOSE from the
    // end-of-stream listener used by pump().
    if (!this._readableState?.ended) {
      this.push(null);
    }
    if (!this._writableState?.ended) {
      this.end();
    }
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
      if (Buffer.isBuffer(msg)) {
        const data = msg.toJSON();
        data._isBuffer = true;
        this._port.postMessage(data, this._url);
      } else {
        this._port.postMessage(msg, this._url);
      }
    } catch (err) {
      return cb(new Error('PortDuplexStream - disconnected'));
    }
    cb();
  };
}
