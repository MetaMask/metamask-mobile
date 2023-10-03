import axios from 'axios';
import { getFixturesServerPortInApp } from './utils';

const FETCH_TIMEOUT = 40000; // Timeout in milliseconds

// Configure Axios with CORS headers
axios.defaults.headers.common['Access-Control-Allow-Origin'] = '*';
axios.defaults.headers.common['Access-Control-Allow-Methods'] =
  'GET, POST, PUT, DELETE';
axios.defaults.headers.common['Access-Control-Allow-Headers'] =
  'Origin, X-Requested-With, Content-Type, Accept';

const fetchWithTimeout = (url) =>
  new Promise((resolve, reject) => {
    axios
      .get(url)
      .then((response) => resolve(response))
      .catch((error) => reject(error));
    setTimeout(() => {
      reject(new Error('Request timeout'));
    }, FETCH_TIMEOUT);
  });

const FIXTURE_SERVER_HOST = 'localhost';
const FIXTURE_SERVER_URL = `http://${FIXTURE_SERVER_HOST}:${getFixturesServerPortInApp()}/state.json`;

class ReadOnlyNetworkStore {
  constructor() {
    this._initialized = false;
    this._initializing = this._init();
    this._state = undefined;
    this._asyncState = undefined;
  }

  async _init() {
    try {
      const response = await fetchWithTimeout(FIXTURE_SERVER_URL);
      if (response.status === 200) {
        this._state = response.data?.state;
        this._asyncState = response.data?.asyncState;
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.debug(`Error loading network state: '${error}'`);
    } finally {
      this._initialized = true;
    }
  }
  // Redux Store
  async getState() {
    if (!this._initialized) {
      await this._initializing;
    }
    return this._state;
  }

  async setState(state) {
    if (!state) {
      throw new Error('MetaMask - updated state is missing');
    }
    if (!this._initialized) {
      await this._initializing;
    }
    this._state = state;
  }
  // Async Storage
  async getItem(key) {
    if (!this._initialized) {
      await this._initializing;
    }
    const value = this._asyncState[key];
    return value !== undefined ? value : null;
  }

  async setItem(key, value) {
    if (!this._initialized) {
      await this._initializing;
    }
    this._asyncState[key] = value;
  }

  async removeItem(key) {
    if (!this._initialized) {
      await this._initializing;
    }
    delete this._asyncState[key];
  }
}

export default new ReadOnlyNetworkStore();
