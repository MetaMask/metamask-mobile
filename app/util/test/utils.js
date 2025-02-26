export const flushPromises = () => new Promise(setImmediate);

export const FIXTURE_SERVER_PORT = 12345;

// E2E test configuration required in app
export const testConfig = {};

/**
 * TODO: Update this condition once we change E2E builds to use release instead of debug
 */
export const isTest = process.env.METAMASK_ENVIRONMENT !== 'production';
export const isE2E = process.env.METAMASK_ENVIRONMENT === 'e2e';

export const getFixturesServerPortInApp = () =>
  testConfig.fixtureServerPort ?? FIXTURE_SERVER_PORT;


import axios from 'axios';


const fetchWithTimeout = (url) =>
  new Promise((resolve, reject) => {
    axios
      .get(url)
      .then((response) => resolve(response))
      .catch((error) => reject(error));
    setTimeout(() => {
      reject(new Error('Request timeout'));
    }, 1000);
  });

const FIXTURE_SERVER_HOST = 'localhost';
const BROWSERSTACK_LOCAL_HOST = 'bs-local.com';
const FIXTURE_SERVER_URL = `http://${FIXTURE_SERVER_HOST}:${getFixturesServerPortInApp()}/state.json`;

export const getInitialState = async () => {
  const urls = [
    FIXTURE_SERVER_URL,
    FIXTURE_SERVER_URL.replace(FIXTURE_SERVER_HOST, BROWSERSTACK_LOCAL_HOST)
  ];

  try {
    for (const url of urls) {
      try {
        const response = await fetchWithTimeout(url);
        if (response.status === 200) {
          return response.data?.state;
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
  }
};
