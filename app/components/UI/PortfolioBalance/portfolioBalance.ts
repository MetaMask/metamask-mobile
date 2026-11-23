export type PortfolioSliceStatus = 'loading' | 'ready' | 'error' | 'ineligible';

export interface PortfolioSlice {
  status: PortfolioSliceStatus;
  valueFiat: number;
}

/** Products the homepage adds on top of the aggregated token balance. */
export const NON_TOKEN_SLICE_KEYS = [
  'money',
  'perps',
  'predict',
  'defi',
] as const;

export type NonTokenSliceKey = (typeof NON_TOKEN_SLICE_KEYS)[number];

export interface NonTokenContribution {
  /** Ready perps, predictions, DeFi, and money, in the user's currency. */
  totalFiat: number;
  /** True while any of those products is still loading. */
  isLoading: boolean;
}

type DeFiPositionsByChain = Partial<
  Record<
    string,
    { protocols?: Record<string, { aggregatedMarketValue?: unknown }> }
  >
>;

/** Sum of DeFi position market values in USD across all chains. */
export const sumDefiPositionsUsd = (
  positionsByChain: DeFiPositionsByChain,
): number =>
  Object.values(positionsByChain).reduce((chainTotal, chainPositions) => {
    if (!chainPositions) return chainTotal;
    const { protocols = {} } = chainPositions;
    return (
      chainTotal +
      Object.values(protocols).reduce(
        (protocolTotal, protocol) =>
          protocolTotal + (Number(protocol.aggregatedMarketValue) || 0),
        0,
      )
    );
  }, 0);

const portfolioTotalCache = new Map<string, number>();

export const portfolioCacheKey = (
  userCurrency: string,
  groupId: string,
): string => `${userCurrency}:${groupId}`;

/** Test helper. The cache is process-wide so account switches keep a full total. */
export const clearPortfolioTotalCache = (): void => {
  portfolioTotalCache.clear();
};

export const readPortfolioTotal = (
  userCurrency: string,
  groupId: string,
): number | undefined =>
  portfolioTotalCache.get(portfolioCacheKey(userCurrency, groupId));

export const rememberPortfolioTotal = (
  userCurrency: string,
  groupId: string,
  total: number,
): void => {
  portfolioTotalCache.set(portfolioCacheKey(userCurrency, groupId), total);
};

/**
 * Sum perps, predictions, DeFi, and money. An ineligible product is skipped.
 * An errored product is skipped so one failure does not hide the rest.
 */
export const nonTokenContribution = (
  slices: Partial<Record<NonTokenSliceKey, PortfolioSlice>>,
): NonTokenContribution => {
  let totalFiat = 0;
  let isLoading = false;

  for (const key of NON_TOKEN_SLICE_KEYS) {
    const slice = slices[key];
    if (!slice || slice.status === 'ineligible') {
      continue;
    }
    if (slice.status === 'loading') {
      isLoading = true;
      continue;
    }
    if (slice.status === 'ready' && Number.isFinite(slice.valueFiat)) {
      totalFiat += slice.valueFiat;
    }
  }

  return { totalFiat, isLoading };
};

/**
 * Fiat total for one account group.
 *
 * The selected group includes perps, predictions, DeFi, and money, because
 * those products are loaded for the selected account. Products still loading
 * are left out until they resolve, so the row keeps the token total instead
 * of going blank. A group that was selected earlier keeps that full total.
 * Every other group is the aggregated token balance.
 */
export const portfolioTotal = ({
  isSelected,
  tokenTotal,
  contribution,
  cachedTotal,
}: {
  isSelected: boolean;
  tokenTotal: number;
  contribution: NonTokenContribution;
  cachedTotal?: number;
}): number => {
  if (isSelected) {
    return tokenTotal + contribution.totalFiat;
  }
  if (cachedTotal !== undefined) {
    return cachedTotal;
  }
  return tokenTotal;
};
