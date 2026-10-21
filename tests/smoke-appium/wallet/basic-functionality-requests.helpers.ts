import type { Mockttp } from 'mockttp';
import { getDecodedProxiedURL } from '../notifications/utils/helpers.js';
import { sleep } from '../../framework/Utilities.js';

export const SELECTED_RPC_HOST = 'mainnet.infura.io';

const RPC_METHODS = [
  'eth_chainId',
  'eth_blockNumber',
  'eth_getBalance',
] as const;

const FEE_RPC_METHODS = [
  'eth_gasPrice',
  'eth_feeHistory',
  'eth_maxPriorityFeePerGas',
  'eth_estimateGas',
] as const;

export interface ObservedRequest {
  httpMethod: string;
  url: string;
  rpcMethods: string[];
}

interface ServiceMatcher {
  label: string;
  matches: (url: string) => boolean;
}

/**
 * MetaMask services that run with basic functionality on and stop when it is off.
 * Token detection uses the token API host. Network config and feature flags
 * share the client-config host.
 */
export const BASIC_FUNCTIONALITY_SERVICES: ServiceMatcher[] = [
  {
    label: 'token API and token detection',
    matches: (url) =>
      url.includes('tokens.api.cx.metamask.io') ||
      url.includes('token.api.cx.metamask.io'),
  },
  {
    label: 'price API',
    matches: (url) => url.includes('price.api.cx.metamask.io'),
  },
  {
    label: 'phishing blocklist',
    matches: (url) => url.includes('phishing-detection.api.cx.metamask.io'),
  },
  {
    label: 'network or feature-flag config',
    matches: (url) => url.includes('client-config.api.cx.metamask.io'),
  },
  {
    label: 'account or transaction history',
    matches: (url) => url.includes('accounts.api.cx.metamask.io'),
  },
];

function decodeTargetUrl(requestUrl: string): string {
  try {
    const parsed = new URL(requestUrl);
    const proxied = parsed.searchParams.get('url');
    if (proxied) {
      return getDecodedProxiedURL(requestUrl);
    }
  } catch {
    return requestUrl;
  }
  return requestUrl;
}

function readRpcMethods(body: unknown): string[] {
  if (Array.isArray(body)) {
    return body.flatMap((entry) => readRpcMethods(entry));
  }
  if (
    body !== null &&
    typeof body === 'object' &&
    'method' in body &&
    typeof body.method === 'string'
  ) {
    return [body.method];
  }
  return [];
}

export async function collectObservedRequests(
  mockServer: Mockttp,
): Promise<ObservedRequest[]> {
  const endpoints = await mockServer.getMockedEndpoints();
  const requests = (
    await Promise.all(endpoints.map((endpoint) => endpoint.getSeenRequests()))
  ).flat();

  return Promise.all(
    requests.map(async (request) => {
      let rpcMethods: string[] = [];
      if (request.method === 'POST') {
        try {
          const text = await request.body.getText();
          if (text) {
            rpcMethods = readRpcMethods(JSON.parse(text) as unknown);
          }
        } catch {
          rpcMethods = [];
        }
      }

      return {
        httpMethod: request.method,
        url: decodeTargetUrl(request.url),
        rpcMethods,
      };
    }),
  );
}

function selectedRpcRequests(requests: ObservedRequest[]): ObservedRequest[] {
  return requests.filter((request) => request.url.includes(SELECTED_RPC_HOST));
}

function missingEnabledRequirements(requests: ObservedRequest[]): string[] {
  const missing: string[] = [];
  const rpcMethods = new Set(
    selectedRpcRequests(requests).flatMap((request) => request.rpcMethods),
  );

  RPC_METHODS.forEach((method) => {
    if (!rpcMethods.has(method)) {
      missing.push(`selected RPC ${method}`);
    }
  });

  const hasFeeEstimate =
    FEE_RPC_METHODS.some((method) => rpcMethods.has(method)) ||
    requests.some((request) => request.url.includes('gas.api.cx.metamask.io'));
  if (!hasFeeEstimate) {
    missing.push('gas or fee estimate');
  }

  BASIC_FUNCTIONALITY_SERVICES.forEach((service) => {
    if (!requests.some((request) => service.matches(request.url))) {
      missing.push(service.label);
    }
  });

  return missing;
}

function unexpectedDisabledRequests(requests: ObservedRequest[]): string[] {
  return BASIC_FUNCTIONALITY_SERVICES.flatMap((service) =>
    requests
      .filter((request) => service.matches(request.url))
      .map((request) => `${service.label}: ${request.url}`),
  ).concat(
    requests
      .filter(
        (request) =>
          request.url.includes('gas.api.cx.metamask.io') ||
          (request.url.includes('infura.io') &&
            !request.url.includes(SELECTED_RPC_HOST)),
      )
      .map((request) => `non-selected service: ${request.url}`),
  );
}

function formatObservedRequests(requests: ObservedRequest[]): string {
  if (requests.length === 0) {
    return '(none)';
  }
  return requests
    .map((request, index) => {
      const methods =
        request.rpcMethods.length > 0
          ? ` rpc=${request.rpcMethods.join(',')}`
          : '';
      return `[${String(index + 1)}] ${request.httpMethod} ${request.url}${methods}`;
    })
    .join('\n');
}

/**
 * Polls the mock server until the basic-functionality request matrix matches.
 */
export async function waitForBasicFunctionalityRequests(
  mockServer: Mockttp,
  basicFunctionalityEnabled: boolean,
  timeoutMs = 90_000,
): Promise<ObservedRequest[]> {
  const startedAt = Date.now();
  let latest: ObservedRequest[] = [];

  while (Date.now() - startedAt < timeoutMs) {
    latest = await collectObservedRequests(mockServer);

    if (basicFunctionalityEnabled) {
      if (missingEnabledRequirements(latest).length === 0) {
        return latest;
      }
    } else if (unexpectedDisabledRequests(latest).length > 0) {
      break;
    }

    await sleep(1000);
  }

  if (basicFunctionalityEnabled) {
    const missing = missingEnabledRequirements(latest);
    throw new Error(
      `Basic functionality on did not produce: ${missing.join(', ')}\nSeen requests:\n${formatObservedRequests(latest)}`,
    );
  }

  const unexpected = unexpectedDisabledRequests(latest);
  if (selectedRpcRequests(latest).length === 0 || unexpected.length > 0) {
    throw new Error(
      `Basic functionality off should keep only the selected RPC (${SELECTED_RPC_HOST}). Missing selected RPC: ${String(selectedRpcRequests(latest).length === 0)}. Unexpected: ${unexpected.join(', ') || '(none)'}\nSeen requests:\n${formatObservedRequests(latest)}`,
    );
  }

  return latest;
}
