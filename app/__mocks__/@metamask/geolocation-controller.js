/* eslint-disable import/no-commonjs */
/**
 * Mock for @metamask/geolocation-controller
 */

const Env = {
  DEV: 'DEV',
  PRD: 'PRD',
};

class GeolocationApiService {
  constructor() {
    this.state = {};
  }
}

module.exports = {
  GeolocationApiService,
  Env,
};
