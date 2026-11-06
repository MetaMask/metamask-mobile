import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';
import { ExtendedMessenger } from '../../../ExtendedMessenger';
import { buildMessengerClientInitRequestMock } from '../../utils/test-utils';
import { getWatchOnlyAccountServiceMessenger } from '../../messengers/watch-only-account-service-messenger/watch-only-account-service-messenger';
import { isWatchOnlyAccountsBuildEnabled } from '../../../../constants/featureFlags';
import { watchOnlyAccountServiceInit } from './watch-only-account-service-init';

const mockWatchOnlyAccountService = jest.fn();
jest.mock('@metamask/watch-only-account-service', () => ({
  WatchOnlyAccountService: mockWatchOnlyAccountService,
}));

jest.mock('../../../../constants/featureFlags', () => ({
  isWatchOnlyAccountsBuildEnabled: jest.fn(),
}));

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
  const isEnabledMock = jest.mocked(isWatchOnlyAccountsBuildEnabled);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('constructs no service when the development build gate is off', () => {
    isEnabledMock.mockReturnValue(false);

    const result = watchOnlyAccountServiceInit(getInitRequestMock());

    expect(result.controller).toBeUndefined();
    expect(mockWatchOnlyAccountService).not.toHaveBeenCalled();
  });

  it('constructs the service gated by the build flag when the gate is on', () => {
    isEnabledMock.mockReturnValue(true);
    const requestMock = getInitRequestMock();

    const result = watchOnlyAccountServiceInit(requestMock);

    expect(mockWatchOnlyAccountService).toHaveBeenCalledWith({
      messenger: requestMock.controllerMessenger,
      isEnabled: isWatchOnlyAccountsBuildEnabled,
    });
    expect(result.controller).toBe(
      mockWatchOnlyAccountService.mock.instances[0],
    );
  });
});
