/* eslint-disable import/no-nodejs-modules */
import http from 'http';
import path from 'path';
import serveHandler from 'serve-handler';

const createStaticServer = function (rootDirectory) {
  return http.createServer((request, response) => {
    if (request.url.startsWith('/node_modules/')) {
      // Only allow serving specific packages from node_modules
      // Map of allowed packages and their public subfolders
      const allowedPackages = {
        'jquery': 'jquery/dist',
        'bootstrap': 'bootstrap/dist',
        // Add more allowed packages as needed
      };
      // Extract the package name from the URL
      const urlParts = request.url.substr(14).split('/');
      const packageName = urlParts[0];
      const subPath = urlParts.slice(1).join('/');
      if (allowedPackages[packageName]) {
        request.url = '/' + subPath;
        return serveHandler(request, response, {
          directoryListing: false,
          public: path.resolve('./node_modules', allowedPackages[packageName]),
        });
      } else {
        // Not allowed, return 404
        response.statusCode = 404;
        response.end('Not found');
        return;
      }
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
