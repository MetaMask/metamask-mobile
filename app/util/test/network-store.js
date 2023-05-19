import axios from 'axios';

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
const FIXTURE_SERVER_PORT = 12345;
const FIXTURE_SERVER_URL = `http://${FIXTURE_SERVER_HOST}:${FIXTURE_SERVER_PORT}/init-state.json`;

export default class ReadOnlyNetworkStore {
  constructor() {
    this._initialized = false;
    this._initializing = this._init();
    this._state = undefined;
  }

  isSupported = true;

  async _init() {
    try {
      console.debug(`Initializing network store...`);
      const response = await fetchWithTimeout(FIXTURE_SERVER_URL);
      if (response.status === 200) {
        this._state = response.data;
        console.debug('network store initialized');
      }
    } catch (error) {
      console.debug(`Error loading network state: '${error}'`);
    } finally {
      this._initialized = true;
    }
  }

  async get() {
    if (!this._initialized) {
      await this._initializing;
    }
    return this._state;
  }

  setMetadata(metadata) {
    this.metadata = metadata;
  }

  async set(state) {
    if (!state) {
      throw new Error('MetaMask - updated state is missing');
    }
    if (!this._initialized) {
      await this._initializing;
    }
    this._state = { data: state, meta: this._metadata };
  }
}
