/* eslint-disable import/no-commonjs */
const Through = require('through2');
const ObjectMultiplex = require('@metamask/object-multiplex');
const pump = require('pump');
const Logger = require('./Logger').default;

/**
 * @param {Error | null | undefined} err
 * @returns {boolean}
 */
function isPrematureCloseError(err) {
  if (!err) {
    return false;
  }
  if (err.message === 'Premature close') {
    return true;
  }
  if (err.code === 'ERR_STREAM_PREMATURE_CLOSE') {
    return true;
  }
  return false;
}

/**
 * Wraps each stream so that its destroy() gracefully ends both sides
 * before actually destroying. This prevents ERR_STREAM_PREMATURE_CLOSE
 * from end-of-stream/pump, which fires when 'close' is emitted but
 * _readableState.ended or _writableState.ended is still false.
 *
 * @param {stream.Stream} stream - The stream to make safe for pump
 * @returns {stream.Stream} The same stream, with destroy() patched
 */
function makeSafeForPump(stream) {
  if (!stream || stream.__pumpSafe) return stream;
  const originalDestroy = stream.destroy;
  if (typeof originalDestroy !== 'function') return stream;

  stream.destroy = function safeDestroy(err) {
    // Gracefully end both sides before destroying so that
    // end-of-stream sees ended=true when 'close' fires.
    if (this._readableState && !this._readableState.ended) {
      try {
        this.push(null);
      } catch (_e) {
        /* already ended */
      }
    }
    if (this._writableState && !this._writableState.ended) {
      try {
        this.end();
      } catch (_e) {
        /* already ended */
      }
    }
    return originalDestroy.call(this, err);
  };
  stream.__pumpSafe = true;
  return stream;
}

/**
 * @param {((err: Error | null) => void) | undefined} userCallback
 * @returns {((err: Error | null) => void) | undefined}
 */
function wrapPumpCallback(userCallback) {
  if (!userCallback) {
    return undefined;
  }
  return function onPumpFinished(err) {
    if (err && isPrematureCloseError(err)) {
      userCallback(null);
      return;
    }
    userCallback(err);
  };
}

/**
 * Drop-in replacement for pump() that gracefully ends streams before
 * destroying them, preventing ERR_STREAM_PREMATURE_CLOSE errors.
 *
 * First argument may be a string label (for logs). Remaining arguments are
 * streams, with an optional callback last (same as pump).
 *
 * @param {...string|stream.Stream|Function} args
 * @returns The piped stream chain
 */
function safePump(...args) {
  let pumpLabel = 'safePump:unlabeled';
  if (typeof args[0] === 'string') {
    pumpLabel = args.shift();
  }
  const cb =
    typeof args[args.length - 1] === 'function' ? args.pop() : undefined;
  const streams = args.map(makeSafeForPump);
  const wrapped = wrapPumpCallback(cb);
  if (wrapped) {
    streams.push(wrapped);
  }
  return pump(...streams);
}

/**
 * Returns a stream transform that parses JSON strings passing through
 * @return {stream.Transform}
 */
function jsonParseStream() {
  return Through.obj(function (serialized, _, cb) {
    this.push(JSON.parse(serialized));
    cb();
  });
}

/**
 * Returns a stream transform that calls {@code JSON.stringify}
 * on objects passing through
 * @return {stream.Transform} the stream transform
 */
function jsonStringifyStream() {
  return Through.obj(function (obj, _, cb) {
    this.push(JSON.stringify(obj));
    cb();
  });
}

/**
 * Absorb expected stream errors (premature close) that occur when the
 * other end of the connection tears down.  Without this listener the
 * error becomes an uncaught exception because no one else is listening.
 *
 * @param {stream.Stream} stream
 */
function absorbPrematureClose(stream) {
  if (!stream || stream.__absorbPC) return;
  stream.on('error', (err) => {
    const isPrematureClose =
      err &&
      (err.message === 'Premature close' ||
        err.code === 'ERR_STREAM_PREMATURE_CLOSE');
    if (!isPrematureClose) {
      Logger.log('[StreamConnection] Unexpected stream error', {
        message: err?.message,
        code: err?.code,
      });
    }
  });
  stream.__absorbPC = true;
}

/**
 * Sets up stream multiplexing for the given stream
 * @param {any} connectionStream - the stream to mux
 * @param {string} [contextLabel] - Identifier for logs (e.g. BackgroundBridge vs Snap)
 * @return {stream.Stream} the multiplexed stream
 */
function setupMultiplex(connectionStream, contextLabel = 'default') {
  const mux = new ObjectMultiplex();
  const pumpLabel = `setupMultiplex:${contextLabel}`;

  // Absorb premature-close errors on the connection stream and mux so
  // they do not surface as uncaught errors during teardown.
  absorbPrematureClose(connectionStream);
  absorbPrematureClose(mux);

  // Wrap mux.createStream so every substream automatically gets
  // a premature-close absorber.  ObjectMultiplex internally uses
  // end-of-stream to detect parent death and calls
  // substream.destroy(prematureCloseError), which emits 'error'.
  const origCreateStream = mux.createStream.bind(mux);
  mux.createStream = function createStreamSafe(name) {
    const sub = origCreateStream(name);
    absorbPrematureClose(sub);
    return sub;
  };

  safePump(pumpLabel, connectionStream, mux, connectionStream, (err) => {
    if (err) {
      Logger.log('[StreamConnection][setupMultiplex] Pump ended with error', {
        contextLabel,
        message: err.message,
      });
    }
  });
  return mux;
}

export {
  jsonParseStream,
  jsonStringifyStream,
  setupMultiplex,
  safePump,
  absorbPrematureClose,
};
