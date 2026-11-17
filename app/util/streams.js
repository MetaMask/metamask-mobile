/* eslint-disable import-x/no-commonjs */
const ObjectMultiplex = require('@metamask/object-multiplex');
const pump = require('pump');

/**
 * Sets up stream multiplexing for the given stream
 * @param {any} connectionStream - the stream to mux
 * @return {stream.Stream} the multiplexed stream
 */
function setupMultiplex(connectionStream) {
  const mux = new ObjectMultiplex();
  pump(connectionStream, mux, connectionStream, (err) => {
    if (err) {
      console.warn(err);
    }
  });
  return mux;
}

export { setupMultiplex };
