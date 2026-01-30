/* eslint-disable import/no-nodejs-modules */
import http from 'http';
import path from 'path';
import { execSync } from 'child_process';
import serveHandler from 'serve-handler';

/**
 * Browser Playground Server Helper for Appwright E2E Tests
 *
 * Serves the @metamask/browser-playground static files locally for testing.
 * Supports both Android (via 10.0.2.2) and iOS (via localhost) access.
 */

const BROWSER_PLAYGROUND_PATH = path.resolve(
  __dirname,
  '../../../../node_modules/@metamask/browser-playground/build',
);

// Default port for the playground server
const DEFAULT_PORT = 8090;

class PlaygroundDappServer {
  constructor() {
    this._server = null;
    this._port = DEFAULT_PORT;
    this._isStarted = false;
  }

  /**
   * Start the playground server
   * @param {number} port - Port to listen on (default: 8090)
   * @returns {Promise<number>} - The port the server is running on
   */
  async start(port = DEFAULT_PORT) {
    if (this._isStarted) {
      console.log(`Playground server already running on port ${this._port}`);
      return this._port;
    }

    this._port = port;

    return new Promise((resolve, reject) => {
      this._server = http.createServer(async (request, response) =>
        // Serve static files from the browser-playground build directory
        serveHandler(request, response, {
          directoryListing: false,
          public: BROWSER_PLAYGROUND_PATH,
        }),
      );

      this._server.once('error', (error) => {
        console.error(
          `Failed to start playground server on port ${this._port}: ${error}`,
        );
        reject(error);
      });

      this._server.listen(this._port, () => {
        this._isStarted = true;
        console.log(`Browser playground server started on port ${this._port}`);
        console.log(`Serving files from: ${BROWSER_PLAYGROUND_PATH}`);

        // Set up ADB reverse for Android emulator access
        this._setupAndroidPortForwarding();

        resolve(this._port);
      });
    });
  }

  /**
   * Stop the playground server
   * @returns {Promise<void>}
   */
  async stop() {
    if (!this._isStarted || !this._server?.listening) {
      console.log('Playground server is not running');
      return;
    }

    // Clean up ADB reverse
    this._cleanupAndroidPortForwarding();

    return new Promise((resolve) => {
      this._server.close(() => {
        this._isStarted = false;
        console.log('Browser playground server stopped');
        resolve();
      });
    });
  }

  /**
   * Get the URL for accessing the playground
   * @param {string} platform - 'android' or 'ios'
   * @returns {string} - The URL to access the playground
   */
  getUrl(platform = 'android') {
    if (platform === 'android') {
      // Android emulator accesses host machine via 10.0.2.2
      return `http://10.0.2.2:${this._port}`;
    }
    // iOS simulator can use localhost directly
    return `http://localhost:${this._port}`;
  }

  /**
   * Get the port the server is running on
   * @returns {number}
   */
  getPort() {
    return this._port;
  }

  /**
   * Check if the server is running
   * @returns {boolean}
   */
  isStarted() {
    return this._isStarted;
  }

  /**
   * Set up ADB reverse port forwarding for Android emulator
   * This allows the emulator to access localhost:{port} via 10.0.2.2:{port}
   * @private
   */
  _setupAndroidPortForwarding() {
    try {
      execSync(`adb reverse tcp:${this._port} tcp:${this._port}`, {
        stdio: 'pipe',
      });
      console.log(`ADB reverse port ${this._port} configured`);
    } catch (error) {
      // ADB might not be available (e.g., on iOS-only runs)
      console.warn(
        `Could not set up ADB reverse (may be expected on iOS): ${error.message}`,
      );
    }
  }

  /**
   * Clean up ADB reverse port forwarding
   * @private
   */
  _cleanupAndroidPortForwarding() {
    try {
      execSync(`adb reverse --remove tcp:${this._port}`, { stdio: 'pipe' });
      console.log(`ADB reverse port ${this._port} removed`);
    } catch {
      // Ignore cleanup errors
    }
  }
}

// Export singleton instance
const playgroundDappServer = new PlaygroundDappServer();
export default playgroundDappServer;
