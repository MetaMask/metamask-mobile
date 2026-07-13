import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { ImageSourcePropType } from 'react-native';
import type { CaipChainId } from '@metamask/utils';
import type { TokenRatesControllerState } from '@metamask/assets-controllers';
import BigNumber from 'bignumber.js';
import { MULTICHAIN_NETWORK_DECIMAL_PLACES } from '@metamask/multichain-network-controller';
import {
  selectBalanceBySelectedAccountGroup,
  selectBalanceChangeBySelectedAccountGroup,
} from '../../../../../selectors/assets/balances';
import { selectAssetsBySelectedAccountGroup } from '../../../../../selectors/assets/assets-list';
import { selectTokenMarketData } from '../../../../../selectors/tokenRatesController';
import { selectMultichainAssetsRates } from '../../../../../selectors/multichain/multichain';
import type { MultichainRatesForPriceChange } from '../../../../UI/Tokens/hooks/useTokenPricePercentageChange';
import { useNetworkEnablement } from '../../../../hooks/useNetworkEnablement/useNetworkEnablement';
import I18n, { strings } from '../../../../../../locales/i18n';
import { formatWithThreshold } from '../../../../../util/assets';
import ethLogo from '../../../../../images/eth-logo-new.png';
import imageIcons from '../../../../../images/image-icons';
import type { SliceData, DrilldownRow } from '../../types';
import {
  SLICE_COLOR_PLACEHOLDER,
  SLICE_LABELS,
  MAX_DRILLDOWN_ROWS,
} from '../../constants';
import { useFiatNormalizer } from '../useFiatNormalizer';
import {
  getAssetFiatBalance,
  getTokenDrilldownGroupKey,
  getTokenGroupHoldingPercentChange1d,
  type AssetWithFiat,
} from '../../utils/tokenGroupHoldingChange1d';

export type { AssetWithFiat } from '../../utils/tokenGroupHoldingChange1d';
export {
  getAssetFiatBalance,
  getTokenDrilldownGroupKey,
  getTokenGroupHoldingPercentChange1d,
} from '../../utils/tokenGroupHoldingChange1d';

/** Match token list display threshold (see `assetToToken` in assets-list). */
const TOKEN_BALANCE_DISPLAY_THRESHOLD = 0.00001;

interface GroupedTokenAggregate {
  key: string;
  displaySymbol: string;
  totalFiat: number;
  /** Sorted by fiat desc; used for icon + primary name. */
  members: AssetWithFiat[];
}

function aggregateTokensBySymbol(
  assets: AssetWithFiat[],
): GroupedTokenAggregate[] {
  const byKey = new Map<string, AssetWithFiat[]>();
  for (const asset of assets) {
    const k = getTokenDrilldownGroupKey(asset);
    const list = byKey.get(k);
    if (list) {
      list.push(asset);
    } else {
      byKey.set(k, [asset]);
    }
  }

  const groups: GroupedTokenAggregate[] = [];
  for (const [key, members] of byKey) {
    members.sort((a, b) => getAssetFiatBalance(b) - getAssetFiatBalance(a));
    const totalFiat = members.reduce((s, a) => s + getAssetFiatBalance(a), 0);
    const displaySymbol =
      members[0]?.symbol?.trim() || members[0]?.name?.trim() || '—';
    groups.push({ key, displaySymbol, totalFiat, members });
  }

  groups.sort((a, b) => b.totalFiat - a.totalFiat);
  return groups;
}

function iconUriFromAssets(assets: AssetWithFiat[]): string | undefined {
  for (const a of assets) {
    if (typeof a.image === 'string' && a.image.length > 0) {
      return a.image;
    }
  }
  return undefined;
}

/**
 * Native ETH uses bundled artwork (same as TokenIcon) — API `image` URLs are often
 * chain-specific or wrong for grouped multi-chain rows.
 */
function resolveTokenGroupAvatar(
  members: AssetWithFiat[],
  displaySymbol: string,
): {
  name: string;
  imageUri?: string;
  localImage?: ImageSourcePropType;
} {
  const symUpper = displaySymbol.trim().toUpperCase();
  if (symUpper === 'ETH') {
    return { name: displaySymbol, localImage: ethLogo };
  }
  if (symUpper === 'SOL') {
    return { name: displaySymbol, localImage: imageIcons.SOLANA };
  }
  const uri = iconUriFromAssets(members);
  return { name: displaySymbol, imageUri: uri };
}

function sumTokenBalancesBn(members: AssetWithFiat[]): BigNumber {
  return members.reduce(
    (acc, m) => acc.plus(m.balance ?? '0'),
    new BigNumber(0),
  );
}

function maxFractionDigitsForGroup(members: AssetWithFiat[]): number {
  let max = 5;
  for (const m of members) {
    const chainPlaces =
      m.chainId != null
        ? MULTICHAIN_NETWORK_DECIMAL_PLACES[m.chainId as CaipChainId]
        : undefined;
    max = Math.max(max, chainPlaces ?? 5);
    if (typeof m.decimals === 'number') {
      max = Math.max(max, Math.min(m.decimals, 8));
    }
  }
  return Math.min(max, 8);
}

/** Human-readable sum of token units, e.g. "0.431 ETH". */
export function formatGroupedTokenAmount(
  members: AssetWithFiat[],
  symbol: string,
): string {
  const sum = sumTokenBalancesBn(members);
  const n = sum.toNumber();
  if (!Number.isFinite(n)) {
    return `0 ${symbol}`;
  }
  const maxFD = maxFractionDigitsForGroup(members);
  const formatted = formatWithThreshold(
    n,
    TOKEN_BALANCE_DISPLAY_THRESHOLD,
    I18n.locale,
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: maxFD,
    },
  );
  return `${formatted} ${symbol}`;
}

export function portfolioSharePercent(part: number, total: number): number {
  if (total <= 0 || !Number.isFinite(total) || !Number.isFinite(part)) {
    return 0;
  }
  return Math.round((100 * part) / total);
}

export function portfolioShareFraction(part: number, total: number): number {
  if (total <= 0 || !Number.isFinite(total) || !Number.isFinite(part)) {
    return 0;
  }
  return Math.min(1, Math.max(0, part / total));
}

/**
 * Builds token drilldown rows: one row per symbol/name group across all chains,
 * largest balances first, then a trailing “+N more” bucket for remaining groups.
 */
export function buildTokensDrilldown(
  assetsByGroup: Record<string, AssetWithFiat[]> | null,
  maxRows: number,
  tokensPortfolioFiat: number,
  tokenRatesMarketData?: TokenRatesControllerState['marketData'] | null,
  multichainConversionRates?: MultichainRatesForPriceChange | null,
): DrilldownRow[] {
  // When callers omit 4th/5th args (tests), skip per-row holding %.
  // eslint-disable-next-line prefer-rest-params
  const includeHoldingPct = arguments.length >= 4;

  if (!assetsByGroup) return [];

  const allAssets = (Object.values(assetsByGroup) as AssetWithFiat[][])
    .flat()
    .filter((asset) => getAssetFiatBalance(asset) > 0);

  const groups = aggregateTokensBySymbol(allAssets);
  const topGroups = groups.slice(0, maxRows);
  const otherGroups = groups.slice(maxRows);

  const rows: DrilldownRow[] = topGroups.map((g) => {
    const uniqueChains = new Set(
      g.members.map((a) => a.chainId).filter(Boolean) as string[],
    );
    const multiChain = uniqueChains.size > 1;
    const pct = portfolioSharePercent(g.totalFiat, tokensPortfolioFiat);
    const amountStr = formatGroupedTokenAmount(g.members, g.displaySymbol);
    const networkLabel = strings('balance_breakdown.tokens_across_networks', {
      count: uniqueChains.size,
    });
    const sublabel = multiChain
      ? strings('balance_breakdown.token_drilldown_subtitle_multichain', {
          percent: String(pct),
          amount: amountStr,
          networkLabel,
        })
      : strings('balance_breakdown.token_drilldown_subtitle', {
          percent: String(pct),
          amount: amountStr,
        });

    const holdingPct = includeHoldingPct
      ? getTokenGroupHoldingPercentChange1d(
          g.members,
          tokenRatesMarketData ?? {},
          multichainConversionRates ?? {},
        )
      : undefined;
    const row: DrilldownRow = {
      key: `token-group-${g.key}`,
      label: g.displaySymbol,
      sublabel,
      titleAvatar: resolveTokenGroupAvatar(g.members, g.displaySymbol),
      valueFiat: g.totalFiat,
      progressFraction: portfolioShareFraction(
        g.totalFiat,
        tokensPortfolioFiat,
      ),
    };
    if (
      holdingPct !== undefined &&
      holdingPct !== null &&
      Number.isFinite(holdingPct)
    ) {
      row.pricePercentChange1d = holdingPct;
    }
    return row;
  });

  if (otherGroups.length > 0) {
    const otherTotal = otherGroups.reduce((sum, g) => sum + g.totalFiat, 0);
    const otherCount = otherGroups.length;
    const otherPct = portfolioSharePercent(otherTotal, tokensPortfolioFiat);
    rows.push({
      key: 'tokens-other',
      label: `+${otherCount} more`,
      sublabel: strings('balance_breakdown.token_drilldown_other_subtitle', {
        percent: String(otherPct),
      }),
      valueFiat: otherTotal,
      progressFraction: portfolioShareFraction(otherTotal, tokensPortfolioFiat),
    });
  }

  return rows;
}

export function useTokensSlice(): SliceData {
  const { popularNetworks } = useNetworkEnablement();
  useFiatNormalizer(); // ensures userCurrency is subscribed for reactivity

  const popularChainIdsKey = (popularNetworks ?? []).join(',');
  const chainIdsForBalance = useMemo<CaipChainId[]>(
    () => [...(popularNetworks ?? [])],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [popularChainIdsKey],
  );

  const groupBalanceSelector = useMemo(
    () => selectBalanceBySelectedAccountGroup(chainIdsForBalance),
    [chainIdsForBalance],
  );
  const balanceChange1dSelector = useMemo(
    () => selectBalanceChangeBySelectedAccountGroup('1d', chainIdsForBalance),
    [chainIdsForBalance],
  );

  const groupBalance = useSelector(groupBalanceSelector) as {
    totalBalanceInUserCurrency: number;
    userCurrency: string;
  } | null;

  const balanceChange1d = useSelector(balanceChange1dSelector) as {
    amountChangeInUserCurrency: number;
    percentChange: number;
    userCurrency: string;
  } | null;

  const assetsByGroup = useSelector(
    selectAssetsBySelectedAccountGroup,
  ) as Record<string, AssetWithFiat[]> | null;

  const tokenMarketData = useSelector(selectTokenMarketData);
  const multichainAssetsRates = useSelector(selectMultichainAssetsRates);

  const valueFiat = groupBalance?.totalBalanceInUserCurrency ?? 0;

  const drilldown = useMemo(
    () =>
      buildTokensDrilldown(
        assetsByGroup,
        MAX_DRILLDOWN_ROWS,
        valueFiat,
        tokenMarketData,
        multichainAssetsRates,
      ),
    [assetsByGroup, valueFiat, tokenMarketData, multichainAssetsRates],
  );

  return useMemo<SliceData>(
    () => ({
      key: 'tokens',
      label: SLICE_LABELS.tokens,
      color: SLICE_COLOR_PLACEHOLDER,
      valueFiat,
      percentOfTotal: 0, // computed by aggregator
      delta: balanceChange1d
        ? {
            amount: balanceChange1d.amountChangeInUserCurrency,
            /** `SliceDelta.percent` is a fraction (see `BreakdownHeroValue.formatDelta`). */
            percent: balanceChange1d.percentChange / 100,
            label: '24h',
          }
        : undefined,
      status: 'ready',
      drilldown,
    }),
    [valueFiat, balanceChange1d, drilldown],
  );
}
