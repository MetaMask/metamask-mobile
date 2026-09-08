import { ConstantBackoff } from '@metamask/controller-utils';
import { Messenger } from '@metamask/messenger';
import { KalshiRemoteAdapter } from '../../../app/components/UI/PredictNext/adapters/remote/KalshiRemoteAdapter';
import { PredictApiReadClient } from '../../../app/components/UI/PredictNext/adapters/remote/PredictApiReadClient';
import {
  PREDICT_MARKET_DATA_SERVICE_NAME,
  PredictMarketDataService,
  type PredictMarketDataServiceMessenger,
} from '../../../app/components/UI/PredictNext/services/PredictMarketDataService';

/**
 * PredictNext integration-test harness.
 *
 * REAL: PredictMarketDataService, KalshiRemoteAdapter, PredictApiReadClient,
 * and the public market-data service messenger.
 * MOCKED: HTTP fetch and app-shell base URL/client version configuration.
 */

export interface PredictFetchResult {
  status?: number;
  body?: unknown;
}

export type PredictFetchResponder = (
  url: string,
  init?: RequestInit,
) => Promise<PredictFetchResult> | PredictFetchResult;

export interface PredictNextIntegrationHarness {
  service: PredictMarketDataService;
  messenger: PredictMarketDataServiceMessenger;
  fetchMock: jest.MockedFunction<typeof fetch>;
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
  const messenger: PredictMarketDataServiceMessenger = new Messenger({
    namespace: PREDICT_MARKET_DATA_SERVICE_NAME,
  });
  const fetchMock = jest.fn(async (input, init) =>
    jsonResponse(await responder(String(input), init)),
  ) as jest.MockedFunction<typeof fetch>;
  const adapter = new KalshiRemoteAdapter(
    new PredictApiReadClient({
      baseUrl: 'https://predict.example/',
      clientVersion: '1.0.0',
      fetch: fetchMock,
    }),
  );
  const service = new PredictMarketDataService({
    messenger,
    marketData: adapter.marketData,
    venueId: adapter.venueId,
    policyOptions: {
      backoff: new ConstantBackoff(0),
      maxConsecutiveFailures: 3,
      circuitBreakDuration: 60_000,
    },
  });

  return {
    service,
    messenger,
    fetchMock,
    destroy: () => service.destroy(),
  };
};
