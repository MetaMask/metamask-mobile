import { Messenger, RestrictedMessenger } from '@metamask/base-controller';
import { getTokenSearchDiscoveryDataControllerMessenger } from './token-search-discovery-data-controller-messenger';

describe('getTokenSearchDiscoveryDataControllerMessenger', () => {
  it('returns a restricted messenger', () => {
    const messenger = new Messenger<never, never>();
    const TokenSearchDiscoveryDataControllerMessenger =
      getTokenSearchDiscoveryDataControllerMessenger(messenger);

    expect(TokenSearchDiscoveryDataControllerMessenger).toBeInstanceOf(
      RestrictedMessenger,
    );
  });
});
