// import { DEFAULT_GANACHE_PORT } from '../app/util/test/ganache';
import {
  getFixturesServerPort,
  getGanachePort,
  getLocalTestDappPort,
} from './dynamical-port-generator';

// eslint-disable-next-line import/prefer-default-export
export const reverseServerPort = async (device) => {
  if (device.getPlatform() === 'android') {
    await device.reverseTcpPort(`${getGanachePort()}`);
    await device.reverseTcpPort(`${getFixturesServerPort()}`);
    await device.reverseTcpPort(`${getLocalTestDappPort()}`);
  }
};
