import { WatchOnlyAccountService } from '@metamask/watch-only-account-service';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';
import { ExtendedMessenger } from '../../../ExtendedMessenger';
import { buildMessengerClientInitRequestMock } from '../../utils/test-utils';
import { getWatchOnlyAccountServiceMessenger } from '../../messengers/watch-only-account-service-messenger/watch-only-account-service-messenger';
import { isWatchOnlyAccountsBuildEnabled } from '../../../../constants/featureFlags';
import { watchOnlyAccountServiceInit } from './watch-only-account-service-init';

jest.mock('@metamask/watch-only-account-service');

function getInitRequestMock() {
  const baseMessenger = new ExtendedMessenger<MockAnyNamespace, never, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

  return {
    ...buildMessengerClientInitRequestMock(baseMessenger),
    controllerMessenger: getWatchOnlyAccountServiceMessenger(baseMessenger),
    initMessenger: undefined,
  };
}

describe('watchOnlyAccountServiceInit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('constructs the service gated by the development build flag', () => {
    const requestMock = getInitRequestMock();

    watchOnlyAccountServiceInit(requestMock);

    expect(WatchOnlyAccountService).toHaveBeenCalledWith({
      messenger: requestMock.controllerMessenger,
      isEnabled: isWatchOnlyAccountsBuildEnabled,
    });
  });

  it('returns the constructed service as the controller', () => {
    const requestMock = getInitRequestMock();

    const result = watchOnlyAccountServiceInit(requestMock);

    const constructed = jest.mocked(WatchOnlyAccountService).mock.instances[0];
    expect(result.controller).toBe(constructed);
  });
});
