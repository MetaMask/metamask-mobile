import {
  MultichainAccountService,
  MultichainAccountServiceMessenger,
} from '@metamask/multichain-account-service';
import { buildControllerInitRequestMock } from '../../utils/test-utils';
import { ControllerInitRequest } from '../../types';
import { multichainAccountServiceInit } from './multichain-account-service-init';
import {
  MultichainAccountServiceInitMessenger,
  getMultichainAccountServiceMessenger,
  getMultichainAccountServiceInitMessenger,
} from '../../messengers/multichain-account-service-messenger/multichain-account-service-messenger';
import {
  Messenger,
  MessengerActions,
  MessengerEvents,
  MOCK_ANY_NAMESPACE,
  MockAnyNamespace,
} from '@metamask/messenger';
import { ExtendedMessenger } from '../../../ExtendedMessenger';

jest.mock('@metamask/multichain-account-service');

type MockInitMessenger = Messenger<
  MockAnyNamespace,
  | MessengerActions<MultichainAccountServiceMessenger>
  | MessengerActions<MultichainAccountServiceInitMessenger>,
  | MessengerEvents<MultichainAccountServiceMessenger>
  | MessengerEvents<MultichainAccountServiceInitMessenger>
>;

function getBaseMessenger(): MockInitMessenger {
  return new Messenger<MockAnyNamespace>({
    namespace: MOCK_ANY_NAMESPACE,
  });
}

function getInitRequestMock({
  messenger = getBaseMessenger(),
}: {
  messenger?: MockInitMessenger;
} = {}): jest.Mocked<
  ControllerInitRequest<
    MultichainAccountServiceMessenger,
    MultichainAccountServiceInitMessenger
  >
> {
  const controllerMessenger = getMultichainAccountServiceMessenger(messenger);
  const initMessenger = getMultichainAccountServiceInitMessenger(messenger);

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

describe('MultichainAccountServiceInit', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns service instance', () => {
    expect(
      multichainAccountServiceInit(getInitRequestMock()).controller,
    ).toBeInstanceOf(MultichainAccountService);
  });

  it('initializes with correct messenger and providerConfigs', () => {
    const initRequestMock = getInitRequestMock();

    multichainAccountServiceInit(initRequestMock);

    const serviceMock = jest.mocked(MultichainAccountService);

    expect(serviceMock).toHaveBeenCalledTimes(1);
    const callArgs = serviceMock.mock.calls[0][0];

    expect(callArgs.messenger).toBe(initRequestMock.controllerMessenger);
    expect(callArgs.providerConfigs).toBeDefined();
  });
});
