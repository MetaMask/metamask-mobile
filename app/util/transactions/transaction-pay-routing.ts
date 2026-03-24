import { TransactionMeta } from '@metamask/transaction-controller';
// eslint-disable-next-line import-x/no-namespace -- this module is runtime-probed for an optional export from a newer core version
import * as TransactionPayControllerPackage from '@metamask/transaction-pay-controller';
import { Hex } from '@metamask/utils';

import {
  getMetaMaskPayRouteTransactionType,
  hasPredictWithdrawTransactionType,
} from './metamask-pay';
import { getTokenAddress } from './transaction-pay-token-transfer';

const { TransactionPayStrategy } = TransactionPayControllerPackage;

type TransactionPayStrategy =
  TransactionPayControllerPackage.TransactionPayStrategy;

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- this is an intersection over the runtime module shape
type TransactionPayControllerPackageWithRouteSupport =
  typeof TransactionPayControllerPackage & {
    getStrategyOrderForRouteFromFeatureFlags?: (
      rawFeatureFlags: unknown,
      routeContext: MetaMaskPayStrategyRoute,
    ) => TransactionPayStrategy[];
  };

const getStrategyOrderForRouteFromFeatureFlags = (
  TransactionPayControllerPackage as TransactionPayControllerPackageWithRouteSupport
).getStrategyOrderForRouteFromFeatureFlags;

const DEFAULT_META_MASK_PAY_STRATEGY_ORDER = [
  TransactionPayStrategy.Relay,
  TransactionPayStrategy.Across,
] as const;

const ROUTED_PAY_STRATEGIES = new Set<TransactionPayStrategy>([
  TransactionPayStrategy.Relay,
  TransactionPayStrategy.Across,
]);

interface RawRoutingOverride {
  default?: unknown;
  chains?: Record<string, unknown>;
  tokens?: Record<string, Record<string, unknown>>;
}

interface RawPayStrategies {
  across?: {
    enabled?: boolean;
  };
  relay?: {
    enabled?: boolean;
  };
}

interface RawMetaMaskPayRoutingFlags {
  strategyOrder?: unknown;
  payStrategies?: RawPayStrategies;
  routingOverrides?: {
    overrides?: Record<string, RawRoutingOverride>;
  };
}

interface MetaMaskPayRouteContext {
  chainId?: Hex;
  tokenAddress?: Hex;
  transactionType?: string;
}

export interface MetaMaskPayStrategyRoute {
  chainId?: Hex;
  tokenAddress?: Hex;
  transactionType?: string;
}

interface MetaMaskPayRoutingOverride {
  chains: Record<Hex, TransactionPayStrategy[]>;
  default?: TransactionPayStrategy[];
  tokens: Record<Hex, Record<Hex, TransactionPayStrategy[]>>;
}

interface MetaMaskPayRoutingFlags {
  payStrategies: {
    across: {
      enabled: boolean;
    };
    relay: {
      enabled: boolean;
    };
  };
  routingOverrides: {
    overrides: Record<string, MetaMaskPayRoutingOverride>;
  };
  strategyOrder: TransactionPayStrategy[];
}

function normalizeHex(value: string | undefined): Hex | undefined {
  return value?.toLowerCase() as Hex | undefined;
}

function normalizeStrategy(
  strategy: unknown,
): TransactionPayStrategy | undefined {
  if (typeof strategy !== 'string') {
    return undefined;
  }

  const normalized = strategy.toLowerCase() as TransactionPayStrategy;

  if (!ROUTED_PAY_STRATEGIES.has(normalized)) {
    return undefined;
  }

  return normalized;
}

function normalizeStrategyList(strategies: unknown): TransactionPayStrategy[] {
  if (!Array.isArray(strategies)) {
    return [];
  }

  const dedupedStrategies: TransactionPayStrategy[] = [];
  const seenStrategies = new Set<TransactionPayStrategy>();

  for (const strategy of strategies) {
    const normalizedStrategy = normalizeStrategy(strategy);

    if (!normalizedStrategy || seenStrategies.has(normalizedStrategy)) {
      continue;
    }

    dedupedStrategies.push(normalizedStrategy);
    seenStrategies.add(normalizedStrategy);
  }

  return dedupedStrategies;
}

function normalizeRoutingOverride(
  override: RawRoutingOverride | undefined,
): MetaMaskPayRoutingOverride {
  const chains = Object.entries(override?.chains ?? {}).reduce<
    Record<Hex, TransactionPayStrategy[]>
  >((result, [chainId, strategies]) => {
    const normalizedStrategies = normalizeStrategyList(strategies);

    if (normalizedStrategies.length) {
      result[normalizeHex(chainId) as Hex] = normalizedStrategies;
    }

    return result;
  }, {});

  const tokens = Object.entries(override?.tokens ?? {}).reduce<
    Record<Hex, Record<Hex, TransactionPayStrategy[]>>
  >((result, [chainId, tokenOverrides]) => {
    const normalizedTokenOverrides = Object.entries(
      tokenOverrides ?? {},
    ).reduce<Record<Hex, TransactionPayStrategy[]>>(
      (tokenResult, [tokenAddress, strategies]) => {
        const normalizedStrategies = normalizeStrategyList(strategies);

        if (normalizedStrategies.length) {
          tokenResult[normalizeHex(tokenAddress) as Hex] = normalizedStrategies;
        }

        return tokenResult;
      },
      {},
    );

    if (Object.keys(normalizedTokenOverrides).length) {
      result[normalizeHex(chainId) as Hex] = normalizedTokenOverrides;
    }

    return result;
  }, {});

  const defaultStrategies = normalizeStrategyList(override?.default);

  return {
    chains,
    default: defaultStrategies.length ? defaultStrategies : undefined,
    tokens,
  };
}

function filterEnabledStrategies(
  strategies: readonly TransactionPayStrategy[] | undefined,
  routingFlags: MetaMaskPayRoutingFlags,
): TransactionPayStrategy[] {
  if (!strategies?.length) {
    return [];
  }

  return strategies.filter((strategy) => {
    switch (strategy) {
      case TransactionPayStrategy.Across:
        return routingFlags.payStrategies.across.enabled;
      case TransactionPayStrategy.Relay:
        return routingFlags.payStrategies.relay.enabled;
      default:
        return false;
    }
  });
}

function getTransactionPayRouteContext(
  transactionMeta: TransactionMeta | undefined,
): MetaMaskPayRouteContext {
  const transactionType = getMetaMaskPayRouteTransactionType(transactionMeta);
  const isPostQuote =
    transactionMeta?.metamaskPay?.isPostQuote ??
    hasPredictWithdrawTransactionType(transactionMeta);

  return {
    chainId: normalizeHex(
      (isPostQuote
        ? transactionMeta?.destinationChainId
        : transactionMeta?.chainId) as string | undefined,
    ),
    tokenAddress: normalizeHex(
      (isPostQuote
        ? transactionMeta?.destinationTokenAddress
        : getTokenAddress(transactionMeta)) as string | undefined,
    ),
    transactionType,
  };
}

function normalizeMetaMaskPayRoutingFlags(
  rawFlags: unknown,
): MetaMaskPayRoutingFlags {
  const flags = (rawFlags ?? {}) as RawMetaMaskPayRoutingFlags;
  const strategyOrder = normalizeStrategyList(flags.strategyOrder);

  return {
    payStrategies: {
      across: {
        enabled: flags.payStrategies?.across?.enabled ?? false,
      },
      relay: {
        enabled: flags.payStrategies?.relay?.enabled ?? true,
      },
    },
    routingOverrides: {
      overrides: Object.entries(flags.routingOverrides?.overrides ?? {}).reduce<
        Record<string, MetaMaskPayRoutingOverride>
      >((result, [transactionType, override]) => {
        result[transactionType] = normalizeRoutingOverride(override);
        return result;
      }, {}),
    },
    strategyOrder:
      strategyOrder.length > 0
        ? strategyOrder
        : [...DEFAULT_META_MASK_PAY_STRATEGY_ORDER],
  };
}

function resolveMetaMaskPayStrategies(
  routeContext: MetaMaskPayRouteContext,
  routingFlags: MetaMaskPayRoutingFlags,
): TransactionPayStrategy[] {
  const { chainId, tokenAddress, transactionType } = routeContext;
  const override = transactionType
    ? routingFlags.routingOverrides.overrides[transactionType]
    : undefined;

  const candidates: (readonly TransactionPayStrategy[] | undefined)[] = [
    chainId && tokenAddress
      ? override?.tokens[chainId]?.[tokenAddress]
      : undefined,
    chainId ? override?.chains[chainId] : undefined,
    override?.default,
    routingFlags.strategyOrder,
  ];

  for (const strategies of candidates) {
    const resolvedStrategies = filterEnabledStrategies(
      strategies,
      routingFlags,
    );

    if (resolvedStrategies.length) {
      return resolvedStrategies;
    }
  }

  return [];
}

function normalizeRoute(
  route: MetaMaskPayStrategyRoute,
): MetaMaskPayRouteContext {
  return {
    chainId: normalizeHex(route.chainId),
    tokenAddress: normalizeHex(route.tokenAddress),
    transactionType: route.transactionType,
  };
}

export function getMetaMaskPayStrategiesForRoute(
  route: MetaMaskPayStrategyRoute,
  rawFeatureFlags: unknown,
): TransactionPayStrategy[] {
  const normalizedRoute = normalizeRoute(route);

  if (getStrategyOrderForRouteFromFeatureFlags) {
    return getStrategyOrderForRouteFromFeatureFlags(
      rawFeatureFlags,
      normalizedRoute,
    );
  }

  const routingFlags = normalizeMetaMaskPayRoutingFlags(rawFeatureFlags);

  return resolveMetaMaskPayStrategies(normalizedRoute, routingFlags);
}

export function getMetaMaskPayStrategiesForTransaction(
  transactionMeta: TransactionMeta | undefined,
  rawFeatureFlags: unknown,
): TransactionPayStrategy[] {
  return getMetaMaskPayStrategiesForRoute(
    getTransactionPayRouteContext(transactionMeta),
    rawFeatureFlags,
  );
}
