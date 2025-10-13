import { Messenger, RestrictedMessenger } from '@metamask/base-controller';
import {
  getTokenDetectionControllerMessenger,
  getTokenDetectionControllerInitMessenger,
} from './token-detection-controller-messenger';

describe('getTokenDetectionControllerMessenger', () => {
  it('returns a restricted messenger', () => {
    const messenger = new Messenger<never, never>();
    const tokenDetectionControllerMessenger =
      getTokenDetectionControllerMessenger(messenger);

    expect(tokenDetectionControllerMessenger).toBeInstanceOf(
      RestrictedMessenger,
    );
  });
});

describe('getTokenDetectionControllerInitMessenger', () => {
  it('returns a restricted messenger', () => {
    const messenger = new Messenger<never, never>();
    const tokenDetectionControllerInitMessenger =
      getTokenDetectionControllerInitMessenger(messenger);

    expect(tokenDetectionControllerInitMessenger).toBeInstanceOf(
      RestrictedMessenger,
    );
  });
});
