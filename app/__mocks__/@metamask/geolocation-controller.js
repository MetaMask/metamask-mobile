/* eslint-disable import/no-commonjs */
/**
 * Mock for @metamask/geolocation-controller
 */

const Env = {
  DEV: 'DEV',
  PRD: 'PRD',
};

const UNKNOWN_LOCATION = 'UNKNOWN';

class GeolocationApiService {
  constructor() {
    this.state = {};
  }
}

const getDefaultGeolocationControllerState = () => ({
  location: UNKNOWN_LOCATION,
  status: 'loading',
  lastFetchedAt: null,
  error: null,
});

class GeolocationController {
  constructor({ messenger, state }) {
    this.messenger = messenger;
    this.state = state || getDefaultGeolocationControllerState();
  }

  getGeolocation() {
    return Promise.resolve(this.state.location);
  }
}

module.exports = {
  GeolocationApiService,
  GeolocationController,
  Env,
  UNKNOWN_LOCATION,
  getDefaultGeolocationControllerState,
};
