import { SnapAccountService } from '@metamask/snap-account-service';
import { MOCK_ANY_NAMESPACE, MockAnyNamespace } from '@metamask/messenger';
import { ExtendedMessenger } from '../../../ExtendedMessenger';
import { buildMessengerClientInitRequestMock } from '../../utils/test-utils';
import { getSnapAccountServiceMessenger } from '../../messengers/snap-account-service-messenger/snap-account-service-messenger';
import { snapAccountServiceInit } from './snap-account-service-init';

jest.mock('@metamask/snap-account-service');
jest.mock('../../utils/ensureOnboardingComplete', () => ({
  createEnsureOnboardingCompleteCallback: jest.fn(() => jest.fn()),
}));

function getInitRequestMock() {
  const baseMessenger = new ExtendedMessenger<MockAnyNamespace, never, never>({
    namespace: MOCK_ANY_NAMESPACE,
  });

  return {
    ...buildMessengerClientInitRequestMock(baseMessenger),
    controllerMessenger: getSnapAccountServiceMessenger(baseMessenger),
    initMessenger: undefined,
  };
}

describe('snapAccountServiceInit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('constructs a SnapAccountService with the controller messenger', () => {
    const requestMock = getInitRequestMock();

    snapAccountServiceInit(requestMock);

    expect(SnapAccountService).toHaveBeenCalledTimes(1);
    expect(SnapAccountService).toHaveBeenCalledWith({
      messenger: requestMock.controllerMessenger,
      config: {
        snapPlatformWatcher: {
          ensureOnboardingComplete: expect.any(Function),
        },
      },
    });
  });

  it('returns the constructed service as the controller', () => {
    const requestMock = getInitRequestMock();

    const result = snapAccountServiceInit(requestMock);

    const constructed = jest.mocked(SnapAccountService).mock.instances[0];
    expect(result.controller).toBe(constructed);
  });
});
