// eslint-disable-next-line import/no-nodejs-modules
import { Buffer } from 'buffer';
// We need to use the 'stream' module for the Duplex class
// eslint-disable-next-line import/no-nodejs-modules
import { Duplex } from 'stream';

interface Port {
  addListener: (event: string, listener: (msg: unknown) => void) => void;
  postMessage: (message: unknown, targetOrigin: string) => void;
}

// Explicitly define noop function
const noop = (): void => {
  // No operation
};

export default class PortDuplexStream extends Duplex {
  private _port: Port;
  private _url: string;

  constructor(port: Port, url: string) {
    super({
      objectMode: true,
    });
    this._port = port;
    this._url = url;
    this._port.addListener('message', this._onMessage);
    this._port.addListener('disconnect', this._onDisconnect);
  }

  override push(chunk: unknown, encoding?: BufferEncoding): boolean {
    return super.push(chunk, encoding);
  }

  override destroy(error?: Error): this {
    return super.destroy(error);
  }

  /**
   * Callback triggered when a message is received from
   * the remote Port associated with this Stream.
   *
   * @private
   * @param {unknown} msg - Payload from the onMessage listener of Port
   */
  private _onMessage = (msg: unknown): void => {
    if (Buffer.isBuffer(msg)) {
      const data = Buffer.from(msg);
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
  private _onDisconnect = (): void => {
    if (typeof this.destroy === 'function') {
      this.destroy();
    }
  };

  /**
   * Explicitly sets read operations to a no-op
   */
  override _read = (): void => noop();

  /**
   * Called internally when data should be written to
   * this writable stream.
   *
   * @private
   * @param {unknown} msg Arbitrary object to write
   * @param {string} _encoding Encoding to use when writing payload (unused)
   * @param {Function} cb Called when writing is complete or an error occurs
   */
  override _write = (
    msg: unknown,
    _encoding: string,
    cb: (error?: Error | null) => void,
  ): void => {
    try {
      if (Buffer.isBuffer(msg)) {
        const data = msg.toJSON();
        this._port.postMessage({ ...data, _isBuffer: true }, this._url);
      } else {
        this._port.postMessage(msg, this._url);
      }
    } catch (err) {
      return cb(new Error('PortDuplexStream - disconnected'));
    }
    cb();
  };
}
