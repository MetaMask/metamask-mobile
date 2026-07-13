import { useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { DeFiPositionsControllerState } from '@metamask/assets-controllers';
import { Hex } from '@metamask/utils';
import { selectDefiPositionsByEnabledNetworks } from '../../../../../selectors/defiPositionsController';
import Engine from '../../../../../core/Engine';
import { useFiatNormalizer } from '../useFiatNormalizer';
import type { SliceData, DrilldownRow } from '../../types';
import { SLICE_COLOR_PLACEHOLDER, SLICE_LABELS, MAX_DRILLDOWN_ROWS } from '../../constants';

type DeFiPositionsByChain = NonNullable<
  DeFiPositionsControllerState['allDeFiPositions'][Hex]
>;

/**
 * Sum aggregatedMarketValue across all protocols on all chains.
 * Group by protocolId and produce sorted drilldown rows (top N + Other).
 */
function buildDefiDrilldown(
  positionsByChain: DeFiPositionsByChain,
  toUserCurrency: (v: number) => number,
  maxRows: number,
): { totalFiat: number; drilldown: DrilldownRow[] } {
  // Accumulate per-protocol totals across chains
  const protocolMap: Record<string, { name: string; totalUsd: number }> = {};

  for (const chainPositions of Object.values(positionsByChain)) {
    if (!chainPositions) continue;
    for (const [protocolId, protocolData] of Object.entries(chainPositions)) {
      if (!protocolData || typeof protocolData !== 'object') continue;
      if (!('aggregatedMarketValue' in protocolData)) continue;
      const row = protocolData as unknown as {
        aggregatedMarketValue: number;
        protocolDetails?: { name: string };
        protocolName?: string;
      };
      const marketValue = Number(row.aggregatedMarketValue) || 0;
      if (marketValue === 0) continue;
      if (!protocolMap[protocolId]) {
        protocolMap[protocolId] = {
          name:
            row.protocolDetails?.name ?? row.protocolName ?? protocolId,
          totalUsd: 0,
        };
      }
      protocolMap[protocolId].totalUsd += marketValue;
    }
  }

  const sorted = Object.entries(protocolMap).sort(
    ([, a], [, b]) => b.totalUsd - a.totalUsd,
  );

  const totalFiat = toUserCurrency(
    sorted.reduce((s, [, v]) => s + v.totalUsd, 0),
  );

  const topProtocols = sorted.slice(0, maxRows);
  const otherProtocols = sorted.slice(maxRows);

  const drilldown: DrilldownRow[] = topProtocols.map(([protocolId, data]) => ({
    key: `defi-${protocolId}`,
    label: data.name,
    valueFiat: toUserCurrency(data.totalUsd),
  }));

  if (otherProtocols.length > 0) {
    const otherTotal = otherProtocols.reduce(
      (s, [, v]) => s + v.totalUsd,
      0,
    );
    drilldown.push({
      key: 'defi-other',
      label: `+${otherProtocols.length} more`,
      valueFiat: toUserCurrency(otherTotal),
    });
  }

  return { totalFiat, drilldown };
}

export function useDefiSlice(): SliceData {
  const { toUserCurrency } = useFiatNormalizer();

  const defiPositions = useSelector(selectDefiPositionsByEnabledNetworks);

  // Trigger a fresh poll on screen mount to reduce staleness (DeFi polls every 10 min)
  useEffect(() => {
    Engine.context.DeFiPositionsController?._executePoll?.().catch(
      () => undefined,
    );
  }, []);

  const { totalFiat, drilldown, status } = useMemo(() => {
    if (defiPositions === undefined) {
      return { totalFiat: 0, drilldown: [], status: 'loading' as const };
    }

    if (defiPositions === null) {
      return { totalFiat: 0, drilldown: [], status: 'error' as const };
    }

    if (Object.keys(defiPositions).length === 0) {
      return { totalFiat: 0, drilldown: [], status: 'ready' as const };
    }

    const { totalFiat: tf, drilldown: dd } = buildDefiDrilldown(
      defiPositions as DeFiPositionsByChain,
      (v) => toUserCurrency(v, 'usd'),
      MAX_DRILLDOWN_ROWS,
    );

    return { totalFiat: tf, drilldown: dd, status: 'ready' as const };
  }, [defiPositions, toUserCurrency]);

  return useMemo<SliceData>(
    () => ({
      key: 'defi',
      label: SLICE_LABELS.defi,
      color: SLICE_COLOR_PLACEHOLDER,
      valueFiat: totalFiat,
      percentOfTotal: 0,
      delta: undefined, // DeFi has no historical delta in v1
      status,
      drilldown,
    }),
    [totalFiat, status, drilldown],
  );
}
