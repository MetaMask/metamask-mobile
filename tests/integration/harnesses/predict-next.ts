import { ConstantBackoff } from '@metamask/controller-utils';
import { Messenger } from '@metamask/messenger';
import {
  PredictNextController,
  type PredictNextControllerMessenger,
} from '../../../app/components/UI/PredictNext/controller/PredictNextController';
import type {
  PredictMarketDataServiceActions,
  PredictMarketDataServiceEvents,
} from '../../../app/components/UI/PredictNext/services/PredictMarketDataService';

/**
 * PredictNext integration-test harness.
 *
 * REAL: PredictNextController, PredictMarketDataService, KalshiRemoteAdapter,
 * PredictApiReadClient, and the public service messenger namespace.
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
  controller: PredictNextController;
  messenger: PredictNextControllerMessenger;
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
  const messenger: PredictNextControllerMessenger = new Messenger<
    'PredictMarketDataService',
    PredictMarketDataServiceActions,
    PredictMarketDataServiceEvents
  >({ namespace: 'PredictMarketDataService' });
  const fetchMock = jest.fn(async (input, init) =>
    jsonResponse(await responder(String(input), init)),
  ) as jest.MockedFunction<typeof fetch>;
  const getBearerTokenMock = jest.fn(async () => 'test-bearer-token');
  const controller = new PredictNextController({
    messenger,
    baseUrl: 'https://predict.example/',
    clientVersion: '1.0.0',
    fetch: fetchMock,
    getBearerToken: getBearerTokenMock,
    policyOptions: {
      backoff: new ConstantBackoff(0),
      maxConsecutiveFailures: 3,
      circuitBreakDuration: 60_000,
    },
  });
  controller.initialize();

  return {
    controller,
    messenger,
    fetchMock,
    getBearerTokenMock,
    destroy: () => controller.destroy(),
  };
};
