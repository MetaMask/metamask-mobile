import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import BigNumber from 'bignumber.js';

import { selectTronSpecialAssetsBySelectedAccountGroup } from '../../../../selectors/assets/assets-list';
import { safeParseBigNumber } from '../../../../util/number/bignumber';

export interface TronResource {
  type: 'energy' | 'bandwidth';
  current: number;
  max: number;
  /**
   * Percentage of the resource that is currently available, in the range 0–100.
   */
  percentage: number;
}

function createResource(
  type: TronResource['type'],
  current: number,
  max: number,
): TronResource {
  const currentBN = new BigNumber(current);

  const divisor = Math.max(1, max);
  const percentage = Math.min(
    100,
    Math.max(0, currentBN.div(divisor).multipliedBy(100).toNumber()),
  );

  return {
    type,
    current,
    max,
    percentage,
  };
}

/**
 * Hook to build Tron daily resource data (energy and bandwidth) for the
 * currently selected account group.
 *
 * It normalizes raw Tron resource assets into a simple model consumable by
 * UI components. The max capacity is derived only from the base max values,
 * matching the behavior used in the extension codebase.
 */
export const useTronResources = (): {
  energy: TronResource;
  bandwidth: TronResource;
} => {
  const { energy, bandwidth, maxEnergy, maxBandwidth } = useSelector(
    selectTronSpecialAssetsBySelectedAccountGroup,
  );

  return useMemo(() => {
    const energyCurrent = safeParseBigNumber(energy?.balance).toNumber();
    const bandwidthCurrent = safeParseBigNumber(bandwidth?.balance).toNumber();
    const maxEnergyValue = safeParseBigNumber(maxEnergy?.balance).toNumber();
    const maxBandwidthValue = safeParseBigNumber(
      maxBandwidth?.balance,
    ).toNumber();

    return {
      energy: createResource('energy', energyCurrent, maxEnergyValue),
      bandwidth: createResource(
        'bandwidth',
        bandwidthCurrent,
        maxBandwidthValue,
      ),
    };
  }, [energy, bandwidth, maxEnergy, maxBandwidth]);
};
