import { Messenger, MOCK_ANY_NAMESPACE } from '@metamask/messenger';
import {
  getTokenDetectionControllerMessenger,
  getTokenDetectionControllerInitMessenger,
} from './token-detection-controller-messenger';
import { RootMessenger } from '../types';

const getRootMessenger = (): RootMessenger =>
  new Messenger({
    namespace: MOCK_ANY_NAMESPACE,
  });

describe('getTokenDetectionControllerMessenger', () => {
  it('returns a messenger', () => {
    const messenger = getRootMessenger();
    const tokenDetectionControllerMessenger =
      getTokenDetectionControllerMessenger(messenger);

    expect(tokenDetectionControllerMessenger).toBeInstanceOf(Messenger);
  });
});

describe('getTokenDetectionControllerInitMessenger', () => {
  it('returns a messenger', () => {
    const messenger = getRootMessenger();
    const tokenDetectionControllerInitMessenger =
      getTokenDetectionControllerInitMessenger(messenger);

    expect(tokenDetectionControllerInitMessenger).toBeInstanceOf(Messenger);
  });
});
