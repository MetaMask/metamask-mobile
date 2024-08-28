declare module 'eth-json-rpc-filters' {
  import type { JsonRpcMiddleware } from 'json-rpc-engine';

  function createFilterMiddleware(): JsonRpcMiddleware<unknown, unknown>;
  export = createFilterMiddleware;
}

declare module 'eth-json-rpc-filters/subscriptionManager' {
  import { EventEmitter } from 'events';
  import type { JsonRpcMiddleware } from 'json-rpc-engine';

  interface SubscriptionManager extends EventEmitter {
    middleware: JsonRpcMiddleware<unknown, unknown>;
  }

  function createSubscriptionManager(options: {
    provider: any;
    blockTracker: any;
  }): SubscriptionManager;

  export = createSubscriptionManager;
}

declare module 'eth-json-rpc-middleware/providerAsMiddleware' {
  import type { JsonRpcMiddleware } from 'json-rpc-engine';

  function providerAsMiddleware(
    provider: any,
  ): JsonRpcMiddleware<unknown, unknown>;
  export = providerAsMiddleware;
}

declare module 'pump' {
  import { Duplex } from 'stream';

  function pump(...streams: Duplex[]): Duplex;
  export = pump;
}

import {
  NetworkStatus,
  NetworkMetadata as ControllerNetworkMetadata,
} from '@metamask/network-controller';

export interface NetworkMetadata extends ControllerNetworkMetadata {
  isAvailable: boolean;
}

declare module 'json-rpc-engine' {
  export type JsonRpcMiddleware<T, U> = (
    req: T,
    res: U,
    next: (error?: Error) => void,
    end: (error?: Error) => void,
  ) => void;
  export class JsonRpcEngine {
    _middleware: JsonRpcMiddleware<unknown, unknown>[];
    push(middleware: JsonRpcMiddleware<unknown, unknown>): void;
    handle(
      req: unknown,
      cb: (error: Error | null, response: unknown) => void,
    ): void;
    asMiddleware(): JsonRpcMiddleware<unknown, unknown>;
    emit(event: string, ...args: any[]): boolean;
  }
}

declare module '@metamask/utils' {
  export type Json =
    | string
    | number
    | boolean
    | null
    | { [property: string]: Json }
    | Json[];
  export type JsonRpcParams = Json[] | Record<string, Json>;
}

declare module '@metamask/network-controller' {
  export interface NetworkMetadata {
    status: NetworkStatus;
    type: string;
    chainId: string;
    ticker: string;
    nickname?: string;
    rpcUrl?: string;
    rpcPrefs?: {
      blockExplorerUrl: string;
    };
  }

  export enum NetworkStatus {
    Unknown = 'unknown',
    Unavailable = 'unavailable',
    Available = 'available',
  }
}
