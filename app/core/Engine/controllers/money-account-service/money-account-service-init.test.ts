import { MoneyAccountService , MoneyAccountServiceMessenger } from '@metamask-previews/money-account-service';
import { buildControllerInitRequestMock } from '../../utils/test-utils';
import { ControllerInitRequest } from '../../types';
import { moneyAccountServiceInit } from './money-account-service-init';
import {
  MoneyAccountServiceInitMessenger,
  getMoneyAccountServiceMessenger,
  getMoneyAccountServiceInitMessenger,
} from '../../messengers/money-account-service-messenger/money-account-service-messenger';
import {
  Messenger,
  MessengerActions,
  MessengerEvents,
  MOCK_ANY_NAMESPACE,
  MockAnyNamespace,
} from '@metamask/messenger';
import { ExtendedMessenger } from '../../../ExtendedMessenger';
import { FeatureFlags } from '@metamask/remote-feature-flag-controller';

jest.mock('@metamask-previews/money-account-service');

const mockRemoteFeatureFlagControllerGetState = jest.fn();

type MockInitMessenger = Messenger<
  MockAnyNamespace,
  | MessengerActions<MoneyAccountServiceMessenger>
  | MessengerActions<MoneyAccountServiceInitMessenger>,
  | MessengerEvents<MoneyAccountServiceMessenger>
  | MessengerEvents<MoneyAccountServiceInitMessenger>
>;

function getBaseMessenger(): MockInitMessenger {
  return new Messenger<MockAnyNamespace>({
    namespace: MOCK_ANY_NAMESPACE,
  });
}

function getInitRequestMock({
  messenger = getBaseMessenger(),
  remoteFeatureFlags = {},
}: {
  messenger?: MockInitMessenger;
  remoteFeatureFlags?: FeatureFlags;
} = {}): jest.Mocked<
  ControllerInitRequest<
    MoneyAccountServiceMessenger,
    MoneyAccountServiceInitMessenger
  >
> {
  messenger.registerActionHandler(
    'RemoteFeatureFlagController:getState',
    mockRemoteFeatureFlagControllerGetState,
  );
  mockRemoteFeatureFlagControllerGetState.mockImplementation(() => ({
    remoteFeatureFlags,
  }));

  const controllerMessenger = getMoneyAccountServiceMessenger(messenger);
  const initMessenger = getMoneyAccountServiceInitMessenger(messenger);

  const extendedControllerMessenger = new ExtendedMessenger<MockAnyNamespace>({
    namespace: MOCK_ANY_NAMESPACE,
  });

  const baseMock = buildControllerInitRequestMock(extendedControllerMessenger);

  return {
    ...baseMock,
    controllerMessenger,
    initMessenger,
  };
}

describe('MoneyAccountServiceInit', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns service instance', () => {
    expect(
      moneyAccountServiceInit(getInitRequestMock()).controller,
    ).toBeInstanceOf(MoneyAccountService);
  });

  it('initializes with correct messenger', () => {
    const initRequestMock = getInitRequestMock();

    moneyAccountServiceInit(initRequestMock);

    const serviceMock = jest.mocked(MoneyAccountService);

    expect(serviceMock).toHaveBeenCalledTimes(1);
    const callArgs = serviceMock.mock.calls[0][0];

    expect(callArgs.messenger).toBe(initRequestMock.controllerMessenger);
  });
});
