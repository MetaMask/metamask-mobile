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
import { KalshiRemoteAdapter } from '../../../app/components/UI/PredictNext/adapters/remote/KalshiRemoteAdapter';
import { PredictApiAccountClient } from '../../../app/components/UI/PredictNext/adapters/remote/PredictApiAccountClient';
import { PredictApiReadClient } from '../../../app/components/UI/PredictNext/adapters/remote/PredictApiReadClient';
import {
  PredictSessionService,
  type PredictSessionServiceActions,
  type PredictSessionServiceEvents,
  type PredictSessionServiceMessenger,
} from '../../../app/components/UI/PredictNext/services/PredictSessionService';

/**
 * PredictNext integration-test harness.
 *
 * REAL: PredictNextController, PredictMarketDataService, PredictSessionService,
 * KalshiRemoteAdapter, Predict API clients, and service messengers.
 * MOCKED: HTTP fetch, required-auth token retrieval, and app-shell configuration.
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
  sessionService: PredictSessionService;
  sessionMessenger: PredictSessionServiceMessenger;
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
    'PredictMarketDataService',
    PredictMarketDataServiceActions,
    PredictMarketDataServiceEvents
  >({ namespace: 'PredictMarketDataService' });
  const fetchMock = jest.fn(async (input, init) =>
    jsonResponse(await responder(String(input), init)),
  ) as jest.MockedFunction<typeof fetch>;
  const sessionMessenger = new Messenger<
    'PredictSessionService',
    PredictSessionServiceActions,
    PredictSessionServiceEvents
  >({ namespace: 'PredictSessionService' });
  const readClient = new PredictApiReadClient({
    baseUrl: 'https://predict.example/predict/',
    clientVersion: '1.0.0',
    fetch: fetchMock,
  });
  const accountClient = new PredictApiAccountClient({
    baseUrl: 'https://predict.example/predict/',
    clientVersion: '1.0.0',
    getBearerToken: async () => 'integration-token',
    fetch: fetchMock,
  });
  const adapter = new KalshiRemoteAdapter(readClient, accountClient);
  const sessionService = new PredictSessionService({
    messenger: sessionMessenger,
    account: adapter.account,
    authenticate: async () => undefined,
    venueId: adapter.venueId,
  });
  const controller = new PredictNextController({
    messenger,
    baseUrl: 'https://predict.example/predict/',
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
    sessionService,
    sessionMessenger,
    fetchMock,
    destroy: () => {
      sessionService.destroy();
      controller.destroy();
    },
  };
};
