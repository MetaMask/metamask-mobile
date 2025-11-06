import { Messenger, RestrictedMessenger } from '@metamask/base-controller';
import {
  getSnapKeyringBuilderMessenger,
  getSnapKeyringBuilderInitMessenger,
} from './snap-keyring-builder-messenger';

describe('getSnapKeyringBuilderMessenger', () => {
  it('returns a restricted messenger', () => {
    const messenger = new Messenger<never, never>();
    const snapKeyringBuilderMessenger =
      getSnapKeyringBuilderMessenger(messenger);

    expect(snapKeyringBuilderMessenger).toBeInstanceOf(RestrictedMessenger);
  });
});

describe('getSnapKeyringBuilderInitMessenger', () => {
  it('returns a restricted messenger', () => {
    const messenger = new Messenger<never, never>();
    const snapKeyringBuilderInitMessenger =
      getSnapKeyringBuilderInitMessenger(messenger);

    expect(snapKeyringBuilderInitMessenger).toBeInstanceOf(RestrictedMessenger);
  });
});
