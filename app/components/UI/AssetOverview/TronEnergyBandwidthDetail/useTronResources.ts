import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import BigNumber from 'bignumber.js';

import { selectTronResourcesBySelectedAccountGroup } from '../../../../selectors/assets/assets-list';

export interface TronResource {
  type: 'energy' | 'bandwidth';
  current: number;
  max: number;
  /**
   * Percentage of the resource that is currently available, in the range 0–100.
   */
  percentage: number;
}

/**
 * Parses a value to a number, defaulting to 0.
 * Use for system values (balances from state) where invalid values should be treated as 0.
 */
function parseValue(value?: string | number): number {
  if (value === undefined || value === null) return 0;
  // Remove commas from string values before parsing
  const cleanValue =
    typeof value === 'string' ? value.replace(/,/g, '') : value;
  const num = Number(cleanValue);
  return Number.isNaN(num) ? 0 : num;
}

function createResource(
  type: TronResource['type'],
  current: number,
  max: number,
): TronResource {
  const currentBN = new BigNumber(current);

  const divisor = Math.max(1, max);
  const percentage = currentBN.div(divisor).multipliedBy(100).toNumber();

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
    selectTronResourcesBySelectedAccountGroup,
  );

  return useMemo(() => {
    const energyCurrent = parseValue(energy?.balance);
    const bandwidthCurrent = parseValue(bandwidth?.balance);
    const maxEnergyValue = parseValue(maxEnergy?.balance);
    const maxBandwidthValue = parseValue(maxBandwidth?.balance);

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
