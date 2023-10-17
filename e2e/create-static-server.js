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
    return serveHandler(request, response, {
      directoryListing: false,
      public: rootDirectory,
    });
  });
};

export default createStaticServer;
