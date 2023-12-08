import { DEFAULT_GANACHE_PORT } from '../../app/util/test/ganache';
import { DEFAULT_FIXTURE_SERVER_PORT } from './fixture-server';
import { DEFAULT_DAPP_SERVER_PORT } from './fixture-helper';

function transformToValidPort(defaultPort, pid) {
  // Improve uniqueness by using a simple transformation
  const transformedPort = (parseInt(pid, 10) % 100000) + defaultPort;

  // Ensure the transformed port falls within the valid port range (0-65535)
  return transformedPort % 65536;
}

function getServerPort(defaultPort) {
  if (process.env.CI) {
    return transformToValidPort(defaultPort, process.pid);
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
