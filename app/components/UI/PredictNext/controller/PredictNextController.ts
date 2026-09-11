import type { CreateServicePolicyOptions } from '@metamask/controller-utils';
import type { Messenger } from '@metamask/messenger';
import Logger from '../../../../util/Logger';
import { KalshiRemoteAdapter } from '../adapters/remote/KalshiRemoteAdapter';
import { PredictApiReadClient } from '../adapters/remote/PredictApiReadClient';
import {
  PredictMarketDataService,
  type PredictMarketDataServiceActions,
  type PredictMarketDataServiceEvents,
} from '../services/PredictMarketDataService';
import {
  PredictPortfolioService,
  type PredictPortfolioServiceActions,
  type PredictPortfolioServiceEvents,
} from '../services/PredictPortfolioService';

export const PREDICT_NEXT_CONTROLLER_NAME = 'PredictNextController' as const;

export type PredictNextControllerActions =
  | PredictMarketDataServiceActions
  | PredictPortfolioServiceActions;
export type PredictNextControllerEvents =
  | PredictMarketDataServiceEvents
  | PredictPortfolioServiceEvents;
export type PredictNextControllerMessenger = Messenger<
  typeof PREDICT_NEXT_CONTROLLER_NAME,
  PredictNextControllerActions,
  PredictNextControllerEvents
>;

export interface PredictNextControllerOptions {
  messenger: PredictNextControllerMessenger;
  baseUrl?: string;
  clientVersion: string;
  fetch?: typeof fetch;
  getBearerToken?: () => Promise<string | undefined>;
  policyOptions?: Pick<
    CreateServicePolicyOptions,
    'backoff' | 'circuitBreakDuration' | 'maxConsecutiveFailures'
  >;
}

/** Composes and owns the PredictNext service graph. */
export class PredictNextController {
  readonly #options: PredictNextControllerOptions;
  #marketDataService?: PredictMarketDataService;
  #portfolioService?: PredictPortfolioService;
  #destroyed = false;

  constructor(options: PredictNextControllerOptions) {
    this.#options = options;
  }

  initialize(): void {
    if (this.#marketDataService || this.#destroyed) {
      return;
    }
    if (!this.#options.baseUrl) {
      Logger.log(
        'PredictNext configuration is missing. Skipping controller initialization.',
      );
      return;
    }

    let client: PredictApiReadClient;
    try {
      client = new PredictApiReadClient({
        baseUrl: this.#options.baseUrl,
        clientVersion: this.#options.clientVersion,
        fetch: this.#options.fetch,
        getBearerToken: this.#options.getBearerToken,
      });
    } catch (error) {
      Logger.error(
        error instanceof Error
          ? error
          : new Error('PredictNext configuration is malformed.'),
      );
      return;
    }

    const adapter = new KalshiRemoteAdapter(client);
    const marketDataMessenger = this.#options.messenger.buildChild<
      'PredictMarketDataService',
      PredictMarketDataServiceActions,
      PredictMarketDataServiceEvents
    >({
      namespace: 'PredictMarketDataService',
      actions: [],
      events: [],
    });
    const portfolioMessenger = this.#options.messenger.buildChild<
      'PredictPortfolioService',
      PredictPortfolioServiceActions,
      PredictPortfolioServiceEvents
    >({
      namespace: 'PredictPortfolioService',
      actions: [],
      events: [],
    });

    this.#marketDataService = new PredictMarketDataService({
      messenger: marketDataMessenger,
      marketData: adapter.marketData,
      venueId: adapter.venueId,
      policyOptions: this.#options.policyOptions,
    });
    this.#portfolioService = new PredictPortfolioService({
      messenger: portfolioMessenger,
      portfolio: adapter.portfolio,
      venueId: adapter.venueId,
      policyOptions: this.#options.policyOptions,
    });
  }

  destroy(): void {
    if (this.#destroyed) {
      return;
    }
    this.#destroyed = true;
    this.#marketDataService?.destroy();
    this.#portfolioService?.destroy();
    this.#marketDataService = undefined;
    this.#portfolioService = undefined;
  }
}
