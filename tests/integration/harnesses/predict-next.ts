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
 * PredictApiReadClient, and both messenger namespaces.
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
    'PredictNextController',
    PredictMarketDataServiceActions,
    PredictMarketDataServiceEvents
  >({ namespace: 'PredictNextController' });
  const fetchMock = jest.fn(async (input, init) =>
    jsonResponse(await responder(String(input), init)),
  ) as jest.MockedFunction<typeof fetch>;
  const controller = new PredictNextController({
    messenger,
    baseUrl: 'https://predict.example/',
    clientVersion: '1.0.0',
    fetch: fetchMock,
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
    destroy: () => controller.destroy(),
  };
};
