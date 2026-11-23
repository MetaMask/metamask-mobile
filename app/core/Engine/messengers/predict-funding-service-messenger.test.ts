import type { AuthenticationController } from '@metamask/profile-sync-controller';
import type { Json } from '@metamask/utils';
import {
  Messenger,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import {
  PredictFundingService,
  type PredictFundingServiceActions,
  type PredictFundingServiceEvents,
} from '../../../components/UI/PredictNext/services/PredictFundingService';
import { KALSHI_VENUE_ID } from '../../../components/UI/PredictNext/adapters/remote/KalshiRemoteAdapter';
import type { PredictDeviceAuthServiceActions } from '../../../components/UI/PredictNext/services/PredictDeviceAuthService';
import type { VenueFundingAdapter } from '../../../components/UI/PredictNext/adapters/types';
import type { GlobalActions, GlobalEvents } from '../types';
import {
  getPredictFundingServiceInitMessenger,
  getPredictFundingServiceMessenger,
} from './predict-funding-service-messenger';

type RootMessenger = Messenger<
  MockAnyNamespace,
  PredictFundingServiceActions,
  PredictFundingServiceEvents
>;

const getRootMessenger = (): RootMessenger =>
  new Messenger({ namespace: MOCK_ANY_NAMESPACE });

describe('getPredictFundingServiceMessenger', () => {
  it('backs every registered action with the matching service method', async () => {
    const rootMessenger = getRootMessenger();
    const serviceMessenger = getPredictFundingServiceMessenger(rootMessenger);
    const funding = {
      prepareDeposit: jest.fn().mockResolvedValue({}),
      getDeposit: jest.fn().mockResolvedValue({}),
      listOpenDeposits: jest.fn().mockResolvedValue([]),
      reportDepositTransfer: jest.fn().mockResolvedValue({}),
      cancelDeposit: jest.fn().mockResolvedValue({}),
    };
    const register = jest.spyOn(serviceMessenger, 'registerActionHandler');
    const service = new PredictFundingService({
      messenger: serviceMessenger,
      funding: funding as unknown as VenueFundingAdapter,
      venueId: KALSHI_VENUE_ID,
    });
    const params = { amount: '5', clientOperationId: 'client-id' };
    const approval = { kind: 'user-approved' };
    const transfer = { txHash: '0x123', chainId: 8453 };
    const argsByMethod: Record<string, unknown[]> = {
      prepareDeposit: [KALSHI_VENUE_ID, params, approval],
      getDeposit: [KALSHI_VENUE_ID, 'operation-id'],
      listOpenDeposits: [KALSHI_VENUE_ID],
      reportDepositTransfer: [KALSHI_VENUE_ID, 'operation-id', transfer],
      cancelDeposit: [KALSHI_VENUE_ID, 'operation-id'],
      getDepositStatus: [KALSHI_VENUE_ID],
      acknowledgeDepositNotice: [KALSHI_VENUE_ID, 'operation-id'],
      refreshDepositStatus: [KALSHI_VENUE_ID],
    };
    try {
      expect(register).toHaveBeenCalledTimes(Object.keys(argsByMethod).length);
      for (const [action] of register.mock.calls) {
        const method = action.split(':')[1];
        expect(service[method as keyof PredictFundingService]).toEqual(
          expect.any(Function),
        );
        const args = argsByMethod[method];
        expect(args).toBeDefined();
        await (rootMessenger.call as (...values: unknown[]) => unknown)(
          action,
          ...args,
        );
        if (method in funding) {
          expect(funding[method as keyof typeof funding]).toHaveBeenCalledWith(
            ...args.slice(1),
            { signal: expect.any(AbortSignal) },
          );
        }
      }
    } finally {
      service.destroy();
    }
  });

  it('delegates only the balance-family invalidation action it consumes', async () => {
    const rootMessenger = getRootMessenger();
    const invalidateQueries = jest.fn().mockResolvedValue(undefined);
    rootMessenger.registerActionHandler(
      'PredictPortfolioService:invalidateQueries',
      invalidateQueries,
    );
    const serviceMessenger = getPredictFundingServiceMessenger(rootMessenger);
    const filters: { queryKey: [string, ...Json[]] } = {
      queryKey: ['PredictPortfolioService:getBalance', KALSHI_VENUE_ID],
    };

    await serviceMessenger.call(
      'PredictPortfolioService:invalidateQueries',
      filters,
    );

    expect(invalidateQueries).toHaveBeenCalledWith(filters);
  });
});

describe('getPredictFundingServiceInitMessenger', () => {
  it('delegates the bearer token used by the unauthenticated-withdraw routes', async () => {
    const rootMessenger = new Messenger<
      MockAnyNamespace,
      AuthenticationController.AuthenticationControllerGetBearerTokenAction,
      never
    >({ namespace: MOCK_ANY_NAMESPACE });
    rootMessenger.registerActionHandler(
      'AuthenticationController:getBearerToken',
      jest.fn().mockResolvedValue('bearer-token'),
    );

    const initMessenger = getPredictFundingServiceInitMessenger(rootMessenger);

    await expect(
      initMessenger.call('AuthenticationController:getBearerToken'),
    ).resolves.toBe('bearer-token');
  });

  it('delegates the bearer token and the device signer the deposit routes need', async () => {
    const root = new Messenger<
      MockAnyNamespace,
      | AuthenticationController.AuthenticationControllerGetBearerTokenAction
      | PredictDeviceAuthServiceActions,
      never
    >({ namespace: MOCK_ANY_NAMESPACE });
    const signOperation = jest.fn().mockResolvedValue(undefined);
    root.registerActionHandler(
      'AuthenticationController:getBearerToken',
      jest.fn().mockResolvedValue('bearer-token'),
    );
    root.registerActionHandler(
      'PredictDeviceAuthService:signOperation',
      signOperation,
    );
    root.registerActionHandler(
      'PredictDeviceAuthService:getApprovalGeneration',
      () => 3,
    );
    root.registerActionHandler(
      'PredictDeviceAuthService:invalidateA2t',
      jest.fn(),
    );
    const messenger = getPredictFundingServiceInitMessenger(root as never);

    await expect(
      messenger.call('AuthenticationController:getBearerToken'),
    ).resolves.toBe('bearer-token');
    expect(
      messenger.call('PredictDeviceAuthService:getApprovalGeneration'),
    ).toBe(3);
    await messenger.call(
      'PredictDeviceAuthService:signOperation',
      'funding.deposit',
      {
        confirmed: true,
      },
    );
    expect(signOperation).toHaveBeenCalledWith('funding.deposit', {
      confirmed: true,
    });
  });

  it('delegates the identity events that abandon observation', () => {
    const rootMessenger = new Messenger<MockAnyNamespace, never, GlobalEvents>({
      namespace: MOCK_ANY_NAMESPACE,
    });
    const initMessenger = getPredictFundingServiceInitMessenger(rootMessenger);
    const abandon = jest.fn();

    initMessenger.subscribe('KeyringController:lock', abandon);
    initMessenger.subscribe('KeyringController:unlock', abandon);
    initMessenger.subscribe('AuthenticationController:stateChange', abandon);
    initMessenger.subscribe('AuthenticationController:profileSignIn', abandon);
    rootMessenger.publish('KeyringController:lock');
    rootMessenger.publish('KeyringController:unlock');

    expect(abandon).toHaveBeenCalledTimes(2);
  });

  it('delegates the session and wallet state actions a session change or deposit resume needs', () => {
    const rootMessenger = new Messenger<
      MockAnyNamespace,
      GlobalActions | PredictDeviceAuthServiceActions,
      never
    >({ namespace: MOCK_ANY_NAMESPACE });
    const signedIn = { isSignedIn: true } as never;
    const keyring = { isUnlocked: true } as never;
    const transactions = { transactions: [] } as never;
    const invalidateA2t = jest.fn();
    rootMessenger.registerActionHandler(
      'AuthenticationController:getState',
      () => signedIn,
    );
    rootMessenger.registerActionHandler(
      'KeyringController:getState',
      () => keyring,
    );
    rootMessenger.registerActionHandler(
      'TransactionController:getState',
      () => transactions,
    );
    rootMessenger.registerActionHandler(
      'PredictDeviceAuthService:invalidateA2t',
      invalidateA2t,
    );
    const initMessenger = getPredictFundingServiceInitMessenger(rootMessenger);

    expect(initMessenger.call('AuthenticationController:getState')).toBe(
      signedIn,
    );
    expect(initMessenger.call('KeyringController:getState')).toBe(keyring);
    expect(initMessenger.call('TransactionController:getState')).toBe(
      transactions,
    );
    initMessenger.call('PredictDeviceAuthService:invalidateA2t');

    expect(invalidateA2t).toHaveBeenCalledTimes(1);
  });
});
