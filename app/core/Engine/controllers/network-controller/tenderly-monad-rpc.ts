import {
  RpcEndpointType,
  type UpdateNetworkFields,
} from '@metamask/network-controller';
import type { Hex } from '@metamask/utils';

function isDevApiEnv(): boolean {
  return (process.env.MM_DEV_API_ENV ?? '').toLowerCase() === 'dev';
}

export const MONAD_CHAIN_ID: Hex = '0x8f';

export const TENDERLY_MONAD_RPC_ENDPOINT_NAME = 'Tenderly Monad fork';

/**
 * Dev-only Monad fork. Production builds never select this URL:
 * `MM_DEV_API_ENV` is inlined at build time and is not `dev` for RC/prod.
 */
const TENDERLY_MONAD_RPC_URL =
  'https://virtual.monad.eu.rpc.tenderly.co/amitabh94/project/0291f8-2a4243';

type MonadRpcEndpoint = UpdateNetworkFields['rpcEndpoints'][number];

export interface MonadRpcConfig {
  rpcEndpoints: MonadRpcEndpoint[];
  defaultRpcEndpointIndex: number;
}

/**
 * Read URL for the Tenderly Monad fork.
 * Present only in builds compiled with `MM_DEV_API_ENV=dev`.
 */
export function tenderlyMonadRpcUrl(): string | undefined {
  if (!isDevApiEnv()) {
    return undefined;
  }
  return TENDERLY_MONAD_RPC_URL;
}

/**
 * Both gates are required. A production build fails the env check even if
 * `moneyMovementBrazilNeobank` is on.
 */
export function shouldUseTenderlyMonadRpc(neobankEnabled: boolean): boolean {
  return Boolean(tenderlyMonadRpcUrl()) && neobankEnabled;
}

function isTenderlyEndpoint(
  endpoint: MonadRpcEndpoint,
  tenderlyRpcUrl: string | undefined,
): boolean {
  return (
    endpoint.name === TENDERLY_MONAD_RPC_ENDPOINT_NAME ||
    (tenderlyRpcUrl !== undefined && endpoint.url === tenderlyRpcUrl)
  );
}

/**
 * Returns the next Monad RPC list, or undefined when the stored config
 * already matches the gate.
 *
 * When the gate turns off, Tenderly endpoints are removed so a later
 * production launch does not keep the fork URL from persisted state.
 */
export function resolveMonadRpcConfig({
  enabled,
  tenderlyRpcUrl,
  rpcEndpoints,
  defaultRpcEndpointIndex,
}: {
  enabled: boolean;
  tenderlyRpcUrl: string | undefined;
  rpcEndpoints: MonadRpcEndpoint[];
  defaultRpcEndpointIndex: number;
}): MonadRpcConfig | undefined {
  if (enabled) {
    if (!tenderlyRpcUrl) {
      return undefined;
    }
    const existingIndex = rpcEndpoints.findIndex(
      (endpoint) => endpoint.url === tenderlyRpcUrl,
    );
    if (existingIndex >= 0 && existingIndex === defaultRpcEndpointIndex) {
      return undefined;
    }
    if (existingIndex >= 0) {
      return {
        rpcEndpoints,
        defaultRpcEndpointIndex: existingIndex,
      };
    }
    return {
      rpcEndpoints: [
        ...rpcEndpoints,
        {
          url: tenderlyRpcUrl,
          name: TENDERLY_MONAD_RPC_ENDPOINT_NAME,
          type: RpcEndpointType.Custom,
        },
      ],
      defaultRpcEndpointIndex: rpcEndpoints.length,
    };
  }

  const hasTenderlyEndpoint = rpcEndpoints.some((endpoint) =>
    isTenderlyEndpoint(endpoint, tenderlyRpcUrl),
  );
  if (!hasTenderlyEndpoint) {
    return undefined;
  }

  const remaining = rpcEndpoints.filter(
    (endpoint) => !isTenderlyEndpoint(endpoint, tenderlyRpcUrl),
  );
  if (remaining.length === 0) {
    return undefined;
  }

  const current = rpcEndpoints[defaultRpcEndpointIndex];
  const restored = remaining.find((endpoint) => endpoint === current);
  return {
    rpcEndpoints: remaining,
    defaultRpcEndpointIndex: restored ? remaining.indexOf(restored) : 0,
  };
}
