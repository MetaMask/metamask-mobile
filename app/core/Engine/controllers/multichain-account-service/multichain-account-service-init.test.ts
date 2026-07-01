import {
  MultichainAccountService,
  MultichainAccountServiceMessenger,
  SOL_ACCOUNT_PROVIDER_NAME,
  BTC_ACCOUNT_PROVIDER_NAME,
  TRX_ACCOUNT_PROVIDER_NAME,
  ///: BEGIN:ONLY_INCLUDE_IF(stellar)
  XLM_ACCOUNT_PROVIDER_NAME,
  ///: END:ONLY_INCLUDE_IF
} from '@metamask/multichain-account-service';
import { buildMessengerClientInitRequestMock } from '../../utils/test-utils';
import { MessengerClientInitRequest } from '../../types';
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
  MessengerClientInitRequest<
    MultichainAccountServiceMessenger,
    MultichainAccountServiceInitMessenger
  >
> {
  const controllerMessenger = getMultichainAccountServiceMessenger(messenger);
  const initMessenger = getMultichainAccountServiceInitMessenger(messenger);

  const extendedControllerMessenger = new ExtendedMessenger<MockAnyNamespace>({
    namespace: MOCK_ANY_NAMESPACE,
  });

  const baseMock = buildMessengerClientInitRequestMock(
    extendedControllerMessenger,
  );

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

  it('enables batched account creation for Solana', () => {
    multichainAccountServiceInit(getInitRequestMock());

    const callArgs = jest.mocked(MultichainAccountService).mock.calls[0][0];
    const { providerConfigs } = callArgs;

    expect(providerConfigs).toBeDefined();
    expect(
      providerConfigs?.[SOL_ACCOUNT_PROVIDER_NAME]?.createAccounts,
    ).toMatchObject({
      batched: true,
    });
  });

  ///: BEGIN:ONLY_INCLUDE_IF(stellar)
  it('enables batched account creation with extended timeout for Stellar', () => {
    multichainAccountServiceInit(getInitRequestMock());

    const callArgs = jest.mocked(MultichainAccountService).mock.calls[0][0];
    const { providerConfigs } = callArgs;

    expect(providerConfigs).toBeDefined();
    const stellarProviderConfig = (
      providerConfigs as Record<
        string,
        { createAccounts?: { batched?: boolean; timeoutMs?: number } }
      >
    )?.[XLM_ACCOUNT_PROVIDER_NAME]?.createAccounts;

    expect(stellarProviderConfig).toMatchObject({
      batched: true,
      timeoutMs: 10000,
    });
  });
  ///: END:ONLY_INCLUDE_IF

  it('does not enable batched account creation for BTC and TRX', () => {
    multichainAccountServiceInit(getInitRequestMock());

    const callArgs = jest.mocked(MultichainAccountService).mock.calls[0][0];
    const { providerConfigs } = callArgs;

    expect(providerConfigs).toBeDefined();
    expect(
      providerConfigs?.[BTC_ACCOUNT_PROVIDER_NAME]?.createAccounts,
    ).toMatchObject({
      batched: false,
    });
    expect(
      providerConfigs?.[TRX_ACCOUNT_PROVIDER_NAME]?.createAccounts,
    ).toMatchObject({
      batched: false,
    });
  });
});
