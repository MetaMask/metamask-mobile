import {
  AccountProviderWrapper,
  MultichainAccountService,
  MultichainAccountServiceMessenger,
  SOL_ACCOUNT_PROVIDER_NAME,
  BTC_ACCOUNT_PROVIDER_NAME,
  TRX_ACCOUNT_PROVIDER_NAME,
} from '@metamask/multichain-account-service';
import type {
  RemoteFeatureFlagControllerGetStateAction,
  RemoteFeatureFlagControllerStateChangeEvent,
} from '@metamask/remote-feature-flag-controller';
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
  ActionConstraint,
} from '@metamask/messenger';
import { ExtendedMessenger } from '../../../ExtendedMessenger';
jest.mock('@metamask/multichain-account-service');
jest.mock('../../../../multichain-stellar/remote-feature-flag', () => ({
  isStellarAccountsFeatureEnabled: (flagValue: unknown) =>
    flagValue === true ||
    (typeof flagValue === 'object' &&
      flagValue !== null &&
      (flagValue as { enabled?: boolean }).enabled === true),
}));

type MockInitMessenger = Messenger<
  MockAnyNamespace,
  | MessengerActions<MultichainAccountServiceMessenger>
  | MessengerActions<MultichainAccountServiceInitMessenger>
  | RemoteFeatureFlagControllerGetStateAction
  | ActionConstraint,
  | MessengerEvents<MultichainAccountServiceMessenger>
  | MessengerEvents<MultichainAccountServiceInitMessenger>
  | RemoteFeatureFlagControllerStateChangeEvent
>;

function getBaseMessenger(
  remoteFeatureFlags: Record<string, unknown> = {},
): MockInitMessenger {
  const messenger = new Messenger<MockAnyNamespace>({
    namespace: MOCK_ANY_NAMESPACE,
  });

  messenger.registerActionHandler(
    'RemoteFeatureFlagController:getState',
    jest.fn().mockReturnValue({
      remoteFeatureFlags,
      localOverrides: {},
    }),
  );

  return messenger as MockInitMessenger;
}

function getInitRequestMock({
  messenger,
  remoteFeatureFlags = {},
}: {
  messenger?: MockInitMessenger;
  remoteFeatureFlags?: Record<string, unknown>;
} = {}): jest.Mocked<
  MessengerClientInitRequest<
    MultichainAccountServiceMessenger,
    MultichainAccountServiceInitMessenger
  >
> {
  const baseMessenger = messenger ?? getBaseMessenger(remoteFeatureFlags);
  const controllerMessenger =
    getMultichainAccountServiceMessenger(baseMessenger);
  const initMessenger = getMultichainAccountServiceInitMessenger(baseMessenger);

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

  it('configures createAccounts with a timeout for bitcoin, tron, and solana', () => {
    multichainAccountServiceInit(getInitRequestMock());

    const callArgs = jest.mocked(MultichainAccountService).mock.calls[0][0];
    const { providerConfigs } = callArgs;

    expect(providerConfigs).toBeDefined();
    expect(
      providerConfigs?.[BTC_ACCOUNT_PROVIDER_NAME]?.createAccounts,
    ).toMatchObject({
      timeoutMs: 3000,
    });
    expect(
      providerConfigs?.[TRX_ACCOUNT_PROVIDER_NAME]?.createAccounts,
    ).toMatchObject({
      timeoutMs: 3000,
    });
    expect(
      providerConfigs?.[SOL_ACCOUNT_PROVIDER_NAME]?.createAccounts,
    ).toMatchObject({
      timeoutMs: 3000,
    });
  });

  describe('Stellar provider', () => {
    const mockSetEnabled = jest.fn();
    const mockXlmProvider = {
      setEnabled: mockSetEnabled,
    } as unknown as AccountProviderWrapper;

    function getSubscriptionHandler(
      subscribeSpy: jest.SpyInstance,
      eventName: string,
    ) {
      const handler = subscribeSpy.mock.calls.find(
        (call) => call[0] === eventName,
      )?.[1];
      expect(handler).toBeDefined();
      return handler as (payload: unknown) => unknown;
    }

    beforeEach(() => {
      jest
        .mocked(AccountProviderWrapper)
        .mockImplementation(() => mockXlmProvider);
      jest.mocked(MultichainAccountService).mockImplementation(
        () =>
          ({
            alignWallets: jest.fn().mockResolvedValue(undefined),
          }) as unknown as MultichainAccountService,
      );
    });

    it('calls RemoteFeatureFlagController:getState during init', () => {
      const requestMock = getInitRequestMock();
      const callSpy = jest.spyOn(requestMock.initMessenger, 'call') as jest.Mock;

      multichainAccountServiceInit(requestMock);

      expect(callSpy).toHaveBeenCalledWith(
        'RemoteFeatureFlagController:getState',
      );
    });

    it.each([true, false])(
      'sets XLM provider enabled to %s based on stellarAccounts feature flag at init',
      (enabled: boolean) => {
        multichainAccountServiceInit(
          getInitRequestMock({
            remoteFeatureFlags: { stellarAccounts: enabled },
          }),
        );

        expect(mockSetEnabled).toHaveBeenCalledWith(enabled);
      },
    );

    it('subscribes to RemoteFeatureFlagController:stateChange on initMessenger', () => {
      const requestMock = getInitRequestMock();
      const subscribeSpy = jest.spyOn(requestMock.initMessenger, 'subscribe');

      multichainAccountServiceInit(requestMock);

      expect(subscribeSpy).toHaveBeenCalledWith(
        'RemoteFeatureFlagController:stateChange',
        expect.any(Function),
      );
    });

    it.each([
      { initial: false, next: true, setEnabledCalls: 1, alignCalls: 1 },
      { initial: true, next: false, setEnabledCalls: 0, alignCalls: 0 },
      { initial: false, next: false, setEnabledCalls: 0, alignCalls: 0 },
      { initial: true, next: true, setEnabledCalls: 0, alignCalls: 0 },
    ])(
      'when feature flag goes from $initial to $next, setEnabled=$setEnabledCalls alignWallets=$alignCalls',
      async ({
        initial,
        next,
        setEnabledCalls,
        alignCalls,
      }: {
        initial: boolean;
        next: boolean;
        setEnabledCalls: number;
        alignCalls: number;
      }) => {
        const requestMock = getInitRequestMock({
          remoteFeatureFlags: { stellarAccounts: initial },
        });
        const subscribeSpy = jest.spyOn(requestMock.initMessenger, 'subscribe');

        const result = multichainAccountServiceInit(requestMock);
        const alignWalletsSpy = jest.spyOn(result.controller, 'alignWallets');

        mockSetEnabled.mockClear();

        const handler = getSubscriptionHandler(
          subscribeSpy,
          'RemoteFeatureFlagController:stateChange',
        );

        await handler({
          remoteFeatureFlags: {
            stellarAccounts: next,
          },
          localOverrides: {},
        });

        expect(mockSetEnabled).toHaveBeenCalledTimes(setEnabledCalls);
        expect(alignWalletsSpy).toHaveBeenCalledTimes(alignCalls);
      },
    );
  });
});
