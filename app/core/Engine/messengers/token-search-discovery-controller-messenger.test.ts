import { Messenger, RestrictedMessenger } from '@metamask/base-controller';
import { getTokenSearchDiscoveryControllerMessenger } from './token-search-discovery-controller-messenger';

describe('getTokenSearchDiscoveryControllerMessenger', () => {
  it('returns a restricted messenger', () => {
    const messenger = new Messenger<never, never>();
    const TokenSearchDiscoveryControllerMessenger =
      getTokenSearchDiscoveryControllerMessenger(messenger);

    expect(TokenSearchDiscoveryControllerMessenger).toBeInstanceOf(
      RestrictedMessenger,
    );
  });
});
