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
      console.debug('response', response);
      if (response.status === 200) {
        this._state = response.data;
      }
    } catch (error) {
      console.debug(`Error loading network state: '${error}'`);
      console.debug(`Error loading network state: '${JSON.stringify(error)}'`);
    } finally {
      this._initialized = true;
    }
  }

  async get() {
    console.log('getting state...', !this._initialized);
    if (!this._initialized) {
      console.log('not initialized...');
      await this._initializing;
    }
    return this._state;
  }

  setMetadata(metadata) {
    this.metadata = metadata;
  }

  async set(state) {
    // if (!this.isSupported) {
    //   throw new Error(
    //     'Metamask- cannot persist state to local store as this browser does not support this action',
    //   );
    // }
    console.log('setting state...');
    if (!state) {
      throw new Error('MetaMask - updated state is missing');
    }
    if (!this.metadata) {
      throw new Error(
        'MetaMask - metadata must be set on instance of ExtensionStore before calling "set"',
      );
    }
    if (!this._initialized) {
      await this._initializing;
    }
    this._state = { data: state, meta: this._metadata };
  }
}
