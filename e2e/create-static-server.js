/* eslint-disable import/no-nodejs-modules */
import http from 'http';
import path from 'path';
import serveHandler from 'serve-handler';

const createStaticServer = function (rootDirectory) {
  return http.createServer((request, response) => {
    if (request.url.startsWith('/node_modules/')) {
      request.url = request.url.substr(14);
      return serveHandler(request, response, {
        directoryListing: false,
        public: path.resolve('./node_modules'),
      });
    }

    // Handle test-dapp-multichain URLs by removing the prefix
    // The multichain test dapp resources are referenced with /test-dapp-multichain/ prefix in its HTML
    if (request.url.startsWith('/test-dapp-multichain/')) {
      request.url = request.url.slice('/test-dapp-multichain'.length);
    }

    return serveHandler(request, response, {
      directoryListing: false,
      public: rootDirectory,
    });
  });
};

export default createStaticServer;
