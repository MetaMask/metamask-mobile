import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { GroupedDeFiPositions } from '@metamask/assets-controllers';
import type { Hex } from '@metamask/utils';
import { selectDefiPositionsByChainIds } from '../../../../../../selectors/defiPositionsController';
import { selectDeFiPositionsSectionEnabled } from '../../../../../../selectors/deFiPositionsSectionEnabled';
import type { RootState } from '../../../../../../reducers';
import { useNetworkEnablement } from '../../../../../hooks/useNetworkEnablement/useNetworkEnablement';
import type { BalanceSlice, FiatConverter } from '../../types';

type DeFiPositionsByChain = Partial<Record<Hex, GroupedDeFiPositions>>;

export function sumDefiPositionsUsd(
  positionsByChain: DeFiPositionsByChain,
): number {
  return Object.values(positionsByChain).reduce(
    (chainTotal, chainPositions) => {
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
    },
    0,
  );
}

export function useDefiSlice(toUserCurrency: FiatConverter): BalanceSlice {
  const { popularEvmNetworks } = useNetworkEnablement();
  const isEnabled = useSelector(selectDeFiPositionsSectionEnabled);
  const positions = useSelector((state: RootState) =>
    selectDefiPositionsByChainIds(state, popularEvmNetworks),
  );

  return useMemo(() => {
    const base = {
      key: 'defi' as const,
    };

    if (!isEnabled) {
      return { ...base, valueFiat: 0, status: 'ineligible' as const };
    }
    if (positions === undefined) {
      return { ...base, valueFiat: 0, status: 'loading' as const };
    }
    if (positions === null) {
      return { ...base, valueFiat: 0, status: 'error' as const };
    }

    const valueFiat = toUserCurrency(
      sumDefiPositionsUsd(positions as DeFiPositionsByChain),
    );
    return valueFiat === undefined
      ? { ...base, valueFiat: 0, status: 'error' as const }
      : { ...base, valueFiat, status: 'ready' as const };
  }, [isEnabled, positions, toUserCurrency]);
}
