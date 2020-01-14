// eslint-disable-next-line import/no-nodejs-modules
import { Buffer } from 'buffer';
import { Duplex } from 'readable-stream';
// eslint-disable-next-line import/no-nodejs-modules
import { inherits } from 'util';

// eslint-disable-next-line no-empty-function
const noop = () => {};

inherits(PortDuplexStream, Duplex);

/**
 * Creates a stream that's both readable and writable.
 * The stream supports arbitrary objects.
 *
 * @class
 * @param {Object} port Remote Port object
 */
function PortDuplexStream(port, url) {
	Duplex.call(this, {
		objectMode: true
	});
	this._port = port;
	this._url = url;
	port.addListener('message', this._onMessage.bind(this));
	port.addListener('disconnect', this._onDisconnect.bind(this));

	if (!this._port._window.webViewRef) {
		console.warn('NO WEBVIEW REF ON CONSTRUCTOR of MobilePortStream', this._port._window);
	} else {
		console.log('Port created ok on MobilePortStream', this._port._window);
	}
}

/**
 * Callback triggered when a message is received from
 * the remote Port associated with this Stream.
 *
 * @private
 * @param {Object} msg - Payload from the onMessage listener of Port
 */
PortDuplexStream.prototype._onMessage = function(msg) {
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
PortDuplexStream.prototype._onDisconnect = function() {
	this.destroy && this.destroy();
};

/**
 * Explicitly sets read operations to a no-op
 */
PortDuplexStream.prototype._read = noop;

/**
 * Called internally when data should be written to
 * this writable stream.
 *
 * @private
 * @param {*} msg Arbitrary object to write
 * @param {string} encoding Encoding to use when writing payload
 * @param {Function} cb Called when writing is complete or an error occurs
 */
PortDuplexStream.prototype._write = function(msg, encoding, cb) {
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

export default PortDuplexStream;
