import type { AuthenticationController } from '@metamask/profile-sync-controller';
import type { Json } from '@metamask/utils';
import {
  Messenger,
  MOCK_ANY_NAMESPACE,
  type MockAnyNamespace,
} from '@metamask/messenger';
import type {
  PredictFundingServiceActions,
  PredictFundingServiceEvents,
} from '../../../components/UI/PredictNext/services/PredictFundingService';
import { KALSHI_VENUE_ID } from '../../../components/UI/PredictNext/adapters/remote/KalshiRemoteAdapter';
import type { PredictDeviceAuthServiceActions } from '../../../components/UI/PredictNext/services/PredictDeviceAuthService';
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
  it('exposes the service actions to the root messenger', async () => {
    const rootMessenger = getRootMessenger();
    const serviceMessenger = getPredictFundingServiceMessenger(rootMessenger);
    const handler = jest.fn().mockResolvedValue([]);
    serviceMessenger.registerActionHandler(
      'PredictFundingService:listOpenDeposits',
      handler,
    );

    await rootMessenger.call(
      'PredictFundingService:listOpenDeposits',
      KALSHI_VENUE_ID,
    );

    expect(handler).toHaveBeenCalledWith(KALSHI_VENUE_ID);
  });

  it('delegates the portfolio invalidation action to the service messenger', async () => {
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
  it('delegates the bearer token and the deposit signer', async () => {
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
});
