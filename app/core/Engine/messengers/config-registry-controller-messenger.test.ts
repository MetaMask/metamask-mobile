import { Messenger } from '@metamask/messenger';
import { getConfigRegistryControllerMessenger } from './config-registry-controller-messenger';
import { getRootMessenger } from '../types';

describe('getConfigRegistryControllerMessenger', () => {
  it('returns a restricted messenger', () => {
    const messenger = getRootMessenger();
    const controllerMessenger = getConfigRegistryControllerMessenger(messenger);

    expect(controllerMessenger).toBeInstanceOf(Messenger);
  });
});
