import axios from 'axios';
import { Platform } from 'react-native';
import { getFixturesServerPortInApp } from './utils';

const FETCH_TIMEOUT = 40000; // Timeout in milliseconds

// `jest` is injected into every module executed by jest-runtime and is
// undefined in the app bundle, so this stays false on device.
const isJestRuntime = typeof jest !== 'undefined';

// Configure Axios with CORS headers
axios.defaults.headers.common['Access-Control-Allow-Origin'] = '*';
axios.defaults.headers.common['Access-Control-Allow-Methods'] =
  'GET, POST, PUT, DELETE';
axios.defaults.headers.common['Access-Control-Allow-Headers'] =
  'Origin, X-Requested-With, Content-Type, Accept';

const fetchWithTimeout = (url) =>
  new Promise((resolve, reject) => {
    // The timer must be cleared once the request settles. Otherwise every
    // attempt keeps a FETCH_TIMEOUT-long timer alive, which under Jest pins the
    // whole module registry of the test file (hundreds of MB) long after the
    // suite finished and fires callbacks into a torn-down environment.
    const timeoutId = setTimeout(() => {
      reject(new Error('Request timeout'));
    }, FETCH_TIMEOUT);

    axios
      .get(url)
      .then((response) => resolve(response))
      .catch((error) => reject(error))
      .finally(() => clearTimeout(timeoutId));
  });

class ReadOnlyNetworkStore {
  constructor() {
    this._initialized = false;
    this._state = undefined;
    this._asyncState = undefined;
  }

  // Redux Store
  async getState() {
    await this._initIfRequired();
    return this._state;
  }

  async setState(state) {
    if (!state) {
      throw new Error('MetaMask - updated state is missing');
    }
    await this._initIfRequired();
    this._state = state;
  }

  // Async Storage
  async getString(key) {
    await this._initIfRequired();
    const value = this._asyncState[key];
    return value !== undefined ? value : null;
  }

  async set(key, value) {
    await this._initIfRequired();
    this._asyncState[key] = value;
  }

  async delete(key) {
    await this._initIfRequired();
    delete this._asyncState[key];
  }

  async clearAll() {
    await this._initIfRequired();
    delete this._asyncState;
  }

  async getAllKeys() {
    await this._initIfRequired();
    return Object.keys(this._asyncState || {});
  }

  async multiGet(keys) {
    await this._initIfRequired();
    return keys.map((key) => [key, this._asyncState?.[key] ?? null]);
  }

  async _initIfRequired() {
    if (!this._initialized) {
      await this._init();
    }
  }

  async _init() {
    // Jest runs with HAS_TEST_OVERRIDES=true (see jest.config.view.js) so that
    // build-time feature gates behave like an E2E build, but there is no
    // fixture server listening. Every request would therefore hang until the
    // FETCH_TIMEOUT, keeping the test file's module registry (and its pending
    // async chain) alive well past teardown. Skip the network entirely: the
    // store stays empty, exactly as it ends up today once the requests fail.
    if (isJestRuntime) {
      this._initialized = true;
      return;
    }

    // Dynamically get the port (works on iOS via LaunchArgs, fallback on Android)
    const port = getFixturesServerPortInApp();
    const isAndroid = Platform.OS === 'android';

    // Build comprehensive URL list to try in order of likelihood:
    // 1. localhost with actual port (works on iOS, might work on Android with adb reverse)
    // 2. 10.0.2.2 with actual port (Android emulator host, direct access without adb reverse!)
    // 3. bs-local.com (BrowserStack)
    const urls = [`http://localhost:${port}/state.json`];

    // Android emulator can access host via 10.0.2.2 without adb reverse
    if (isAndroid) {
      urls.push(`http://10.0.2.2:${port}/state.json`);
    }

    // BrowserStack uses bs-local.com
    urls.push(`http://bs-local.com:${port}/state.json`);

    try {
      for (const url of urls) {
        try {
          const response = await fetchWithTimeout(url);
          if (response.status === 200) {
            this._state = response.data?.state;
            this._asyncState = response.data?.asyncState;
            // eslint-disable-next-line no-console
            console.debug(`Successfully loaded fixture state from ${url}`);
            return;
          }
        } catch (error) {
          // eslint-disable-next-line no-console
          console.debug(`Error loading network state from ${url}: '${error}'`);
          // Continue to next URL if this one failed
        }
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.debug(`Error loading network state: '${error}'`);
    } finally {
      this._initialized = true;
    }
  }
}

export default new ReadOnlyNetworkStore();
