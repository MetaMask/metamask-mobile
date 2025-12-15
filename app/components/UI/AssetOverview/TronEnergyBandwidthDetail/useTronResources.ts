import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import BigNumber from 'bignumber.js';

import { selectTronResourcesBySelectedAccountGroup } from '../../../../selectors/assets/assets-list';
import { TRON_RESOURCE } from '../../../../core/Multichain/constants';

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
  const maxBN = new BigNumber(max);
  const percentageBN = currentBN.dividedBy(maxBN).multipliedBy(100);

  const percentage = BigNumber.min(
    100,
    BigNumber.max(0, percentageBN),
  ).toNumber();

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
  const tronResources = useSelector(selectTronResourcesBySelectedAccountGroup);

  return useMemo(() => {
    let energy;
    let bandwidth;
    let maxEnergy;
    let maxBandwidth;

    // Extract the different Tron resource entries from the flat list.
    for (const asset of tronResources) {
      switch (asset.symbol?.toLowerCase()) {
        case TRON_RESOURCE.ENERGY:
          energy = asset;
          break;
        case TRON_RESOURCE.BANDWIDTH:
          bandwidth = asset;
          break;
        case TRON_RESOURCE.MAX_ENERGY:
          maxEnergy = asset;
          break;
        case TRON_RESOURCE.MAX_BANDWIDTH:
          maxBandwidth = asset;
          break;
        default:
          break;
      }
    }

    const parseValue = (value?: string | number): number => {
      if (value === undefined || value === null) return 0;
      // Remove commas from string values before parsing
      const cleanValue =
        typeof value === 'string' ? value.replace(/,/g, '') : value;
      const num = Number(cleanValue);
      return Number.isNaN(num) ? 0 : num;
    };

    const energyCurrent = parseValue(energy?.balance);
    const bandwidthCurrent = parseValue(bandwidth?.balance);
    const maxEnergyValue = parseValue(maxEnergy?.balance);
    const maxBandwidthValue = parseValue(maxBandwidth?.balance);

    const energyMax = Math.max(1, maxEnergyValue);
    const bandwidthMax = Math.max(1, maxBandwidthValue);

    return {
      energy: createResource('energy', energyCurrent, energyMax),
      bandwidth: createResource('bandwidth', bandwidthCurrent, bandwidthMax),
    };
  }, [tronResources]);
};
