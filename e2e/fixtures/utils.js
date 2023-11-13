import { DEFAULT_GANACHE_PORT } from '../../app/util/test/ganache';
import { DEFAULT_FIXTURE_SERVER_PORT } from './fixture-server';
import { DEFAULT_DAPP_SERVER_PORT } from './fixture-helper';

function getServerPort(defaultPort) {
  if (process.env.CI) {
    return defaultPort + Number(process.env.JEST_WORKER_ID);
  }
  return defaultPort;
}

export function getGanachePort() {
  return getServerPort(DEFAULT_GANACHE_PORT);
}

export function getFixturesServerPort() {
  return getServerPort(DEFAULT_FIXTURE_SERVER_PORT);
}

export function getLocalTestDappPort() {
  return getServerPort(DEFAULT_DAPP_SERVER_PORT);
}
