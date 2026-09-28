import { ConstantBackoff } from '@metamask/controller-utils';
import { Messenger } from '@metamask/messenger';
import { KalshiRemoteAdapter } from '../../../app/components/UI/PredictNext/adapters/remote/KalshiRemoteAdapter';
import { PredictApiReadClient } from '../../../app/components/UI/PredictNext/adapters/remote/PredictApiReadClient';
import {
  PredictMarketDataService,
  type PredictMarketDataServiceActions,
  type PredictMarketDataServiceEvents,
  type PredictMarketDataServiceMessenger,
} from '../../../app/components/UI/PredictNext/services/PredictMarketDataService';
import {
  PredictPortfolioService,
  type PredictPortfolioServiceActions,
  type PredictPortfolioServiceEvents,
  type PredictPortfolioServiceMessenger,
} from '../../../app/components/UI/PredictNext/services/PredictPortfolioService';
import { getPredictMarketDataServiceMessenger } from '../../../app/core/Engine/messengers/predict-market-data-service-messenger';
import { getPredictPortfolioServiceMessenger } from '../../../app/core/Engine/messengers/predict-portfolio-service-messenger';

/**
 * PredictNext integration-test harness.
 *
 * REAL: Engine-root messenger topology, PredictMarketDataService,
 * PredictPortfolioService, KalshiRemoteAdapter, and PredictApiReadClient.
 * MOCKED: HTTP fetch, bearer token provider, base URL, and client version.
 */

export interface PredictFetchResult {
  status?: number;
  body?: unknown;
}

export type PredictFetchResponder = (
  url: string,
  init?: RequestInit,
) => Promise<PredictFetchResult> | PredictFetchResult;

type PredictNextRootActions =
  | PredictMarketDataServiceActions
  | PredictPortfolioServiceActions;
type PredictNextRootEvents =
  | PredictMarketDataServiceEvents
  | PredictPortfolioServiceEvents;
type PredictNextRootMessenger = Messenger<
  'Root',
  PredictNextRootActions,
  PredictNextRootEvents
>;

export interface PredictNextIntegrationHarness {
  messenger: PredictNextRootMessenger;
  marketDataService: PredictMarketDataService;
  portfolioService: PredictPortfolioService;
  fetchMock: jest.MockedFunction<typeof fetch>;
  getBearerTokenMock: jest.MockedFunction<() => Promise<string | undefined>>;
  destroy: () => void;
}

const jsonResponse = ({ status = 200, body }: PredictFetchResult): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }) as Response;

export const buildPredictNextIntegrationHarness = (
  responder: PredictFetchResponder,
): PredictNextIntegrationHarness => {
  const messenger: PredictNextRootMessenger = new Messenger({
    namespace: 'Root',
  });
  const marketDataMessenger: PredictMarketDataServiceMessenger =
    getPredictMarketDataServiceMessenger(messenger);
  const portfolioMessenger: PredictPortfolioServiceMessenger =
    getPredictPortfolioServiceMessenger(messenger);
  const fetchMock = jest.fn(async (input, init) =>
    jsonResponse(await responder(String(input), init)),
  ) as jest.MockedFunction<typeof fetch>;
  const getBearerTokenMock = jest.fn(async () => 'test-bearer-token');
  const adapter = new KalshiRemoteAdapter(
    new PredictApiReadClient({
      baseUrl: 'https://predict.example/',
      clientVersion: '1.0.0',
      fetch: fetchMock,
      getBearerToken: getBearerTokenMock,
    }),
  );
  const policyOptions = {
    backoff: new ConstantBackoff(0),
    maxConsecutiveFailures: 3,
    circuitBreakDuration: 60_000,
  };
  const marketDataService = new PredictMarketDataService({
    messenger: marketDataMessenger,
    marketData: adapter.marketData,
    venueId: adapter.venueId,
    policyOptions,
  });
  const portfolioService = new PredictPortfolioService({
    messenger: portfolioMessenger,
    portfolio: adapter.portfolio,
    venueId: adapter.venueId,
    policyOptions,
  });

  return {
    messenger,
    marketDataService,
    portfolioService,
    fetchMock,
    getBearerTokenMock,
    destroy: () => {
      marketDataService.destroy();
      portfolioService.destroy();
    },
  };
};
