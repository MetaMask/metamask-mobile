// import { DEFAULT_GANACHE_PORT } from '../app/util/test/ganache';
import {
  getFixturesServerPort,
  getGanachePort,
  getLocalTestDappPort,
} from './dynamical-port-generator';
import { DEFAULT_DAPP_SERVER_PORT } from './fixtures/fixture-helper';
import { DEFAULT_FIXTURE_SERVER_PORT } from './fixtures/fixture-server';

// eslint-disable-next-line import/prefer-default-export
export const reverseServerPort = async (device) => {
  if (device.getPlatform() === 'android') {
    await device.reverseTcpPort(`${getGanachePort(8545)}`);
    await device.reverseTcpPort(
      `${getFixturesServerPort(DEFAULT_FIXTURE_SERVER_PORT)}`,
    );
    await device.reverseTcpPort(
      `${getLocalTestDappPort(DEFAULT_DAPP_SERVER_PORT)}`,
    );
  }
};
