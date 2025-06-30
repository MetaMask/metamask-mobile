import axios from 'axios';
import { getFixturesServerPortInApp } from './utils';

const FETCH_TIMEOUT = 40000; // Timeout in milliseconds

// Configure Axios with CORS headers
axios.defaults.headers.common['Access-Control-Allow-Origin'] = '*';
axios.defaults.headers.common['Access-Control-Allow-Methods'] =
  'GET, POST, PUT, DELETE';
axios.defaults.headers.common['Access-Control-Allow-Headers'] =
  'Origin, X-Requested-With, Content-Type, Accept';

interface PerformanceMetric {
  eventName: string;
  timestamp: number;
  duration?: number;
  metadata: Record<string, unknown>;
  id?: string;
  parentId?: string;
}

interface PerformanceSession {
  sessionId: string;
  startTime: number;
  environment: {
    branch: string;
    commitHash: string;
    platform: string;
    appVersion: string;
  };
}

interface PerformanceData {
  metrics: PerformanceMetric[];
  session: PerformanceSession;
}

const fetchWithTimeout = (url: string): Promise<{ status: number; data: PerformanceData }> =>
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
const BROWSERSTACK_LOCALHOST = 'bs-local.com';
const FIXTURE_SERVER_URL = `http://${FIXTURE_SERVER_HOST}:${getFixturesServerPortInApp()}/performance.json`;

class ReadOnlyPerformanceStore {
  private _initialized: boolean = false;
  private _metrics: PerformanceMetric[] = [];
  private _session: PerformanceSession = {
    sessionId: '',
    startTime: 0,
    environment: {
      branch: '',
      commitHash: '',
      platform: '',
      appVersion: '',
    },
  };

  // Get all performance data
  async getPerformanceData(): Promise<PerformanceData> {
    await this._initIfRequired();
    return {
      metrics: this._metrics,
      session: this._session,
    };
  }

  // Get just the metrics
  async getMetrics(): Promise<PerformanceMetric[]> {
    await this._initIfRequired();
    return this._metrics;
  }

  // Get just the session
  async getSession(): Promise<PerformanceSession> {
    await this._initIfRequired();
    return this._session;
  }

  // Clear performance data (for testing)
  async clearPerformanceData(): Promise<void> {
    await this._initIfRequired();
    this._metrics = [];
    this._session = {
      sessionId: '',
      startTime: 0,
      environment: {
        branch: '',
        commitHash: '',
        platform: '',
        appVersion: '',
      },
    };
  }

  private async _initIfRequired(): Promise<void> {
    if (!this._initialized) {
      await this._init();
    }
  }

  private async _init(): Promise<void> {
    // List of URLs to check for Fixture Server availability.
    // Browserstack requires that the HOST is bs-local.com instead of localhost.
    const urls = [
      FIXTURE_SERVER_URL,
      FIXTURE_SERVER_URL.replace(FIXTURE_SERVER_HOST, BROWSERSTACK_LOCALHOST)
    ];

    try {
      for (const url of urls) {
        try {
          const response = await fetchWithTimeout(url);
          if (response.status === 200) {
            this._metrics = response.data?.metrics || [];
            this._session = response.data?.session || {
              sessionId: '',
              startTime: 0,
              environment: {
                branch: '',
                commitHash: '',
                platform: '',
                appVersion: '',
              },
            };
            return;
          }
        } catch (error) {
          // eslint-disable-next-line no-console
          console.debug(`Error loading performance data from ${url}: '${error}'`);
          // Continue to next URL if this one failed
        }
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.debug(`Error loading performance data: '${error}'`);
    } finally {
      this._initialized = true;
    }
  }
}

export default new ReadOnlyPerformanceStore();
