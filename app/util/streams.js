/* eslint-disable import/no-commonjs */
const Through = require('through2');
import ObjectMultiplex from '@metamask/object-multiplex';
import { pipeline } from 'readable-stream';

/**
 * Returns a stream transform that parses JSON strings passing through
 * @return {stream.Transform}
 */
function jsonParseStream() {
  return Through.obj(function (serialized, _, cb) {
    try {
      // eslint-disable-next-line no-console
      console.log(`[METAMASK-DEBUG] jsonParseStream: parsing`, serialized);
      const parsed = JSON.parse(serialized);
      this.push(parsed);
    } catch (error) {
      console.error(`[METAMASK-DEBUG] jsonParseStream error:`, error);
    }
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
 * Sets up stream multiplexing for the given stream
 * @param {any} connectionStream - the stream to mux
 * @return {stream.Stream} the multiplexed stream
 */
function setupMultiplex(connectionStream) {
  // eslint-disable-next-line no-console
  console.log(`[METAMASK-DEBUG] setupMultiplex: Creating new ObjectMultiplex`);
  const mux = new ObjectMultiplex();
  // Handle events on the multiplexer
  mux.on('error', (err) => {
    console.error(`[METAMASK-DEBUG] ObjectMultiplex error:`, err);
  });

  mux.on('data', (data) => {
    // eslint-disable-next-line no-console
    console.log(`[METAMASK-DEBUG] ObjectMultiplex data:`,
      typeof data === 'object' ? JSON.stringify(data) : data);
  });

  // eslint-disable-next-line no-console
  console.log(`[METAMASK-DEBUG] setupMultiplex: Setting up pipeline`);
  pipeline(connectionStream, mux, connectionStream, (err) => {
    if (err) {
      console.error(`[METAMASK-DEBUG] Pipeline error in setupMultiplex:`, err);
    }
  });
  return mux;
}

export { jsonParseStream, jsonStringifyStream, setupMultiplex };
