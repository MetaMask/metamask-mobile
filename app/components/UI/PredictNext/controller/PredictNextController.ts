import type { CreateServicePolicyOptions } from '@metamask/controller-utils';
import Logger from '../../../../util/Logger';
import { KalshiRemoteAdapter } from '../adapters/remote/KalshiRemoteAdapter';
import { PredictApiReadClient } from '../adapters/remote/PredictApiReadClient';
import {
  PredictMarketDataService,
  type PredictMarketDataServiceMessenger,
} from '../services/PredictMarketDataService';

export const PREDICT_NEXT_CONTROLLER_NAME = 'PredictNextController' as const;

export type PredictNextControllerMessenger = PredictMarketDataServiceMessenger;

export interface PredictNextControllerOptions {
  messenger: PredictNextControllerMessenger;
  baseUrl?: string;
  clientVersion: string;
  fetch?: typeof fetch;
  policyOptions?: Pick<
    CreateServicePolicyOptions,
    'backoff' | 'circuitBreakDuration' | 'maxConsecutiveFailures'
  >;
}

/** Composes and owns the PredictNext service graph. */
export class PredictNextController {
  readonly #options: PredictNextControllerOptions;
  #service?: PredictMarketDataService;
  #destroyed = false;

  constructor(options: PredictNextControllerOptions) {
    this.#options = options;
  }

  initialize(): void {
    if (this.#service || this.#destroyed) {
      return;
    }
    if (!this.#options.baseUrl) {
      Logger.error(new Error('PredictNext configuration is missing.'));
      return;
    }

    let client: PredictApiReadClient;
    try {
      client = new PredictApiReadClient({
        baseUrl: this.#options.baseUrl,
        clientVersion: this.#options.clientVersion,
        fetch: this.#options.fetch,
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
    this.#service = new PredictMarketDataService({
      messenger: this.#options.messenger,
      marketData: adapter.marketData,
      venueId: adapter.venueId,
      policyOptions: this.#options.policyOptions,
    });
  }

  destroy(): void {
    if (this.#destroyed) {
      return;
    }
    this.#destroyed = true;
    this.#service?.destroy();
    this.#service = undefined;
  }
}
