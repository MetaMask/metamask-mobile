import { Messenger } from '@metamask/messenger';
import { getConfigRegistryApiServiceMessenger } from './config-registry-api-service-messenger';
import { getRootMessenger } from '../types';

describe('getConfigRegistryApiServiceMessenger', () => {
  it('returns a restricted messenger', () => {
    const messenger = getRootMessenger();
    const controllerMessenger = getConfigRegistryApiServiceMessenger(messenger);

    expect(controllerMessenger).toBeInstanceOf(Messenger);
  });
});
