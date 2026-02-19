import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { selectUserRegion } from '../../../../selectors/rampsController';
import useRampsUnifiedV2Enabled from './useRampsUnifiedV2Enabled';

/**
 * Hook that hydrates RampsController state (tokens and providers) on mount
 * if the user has a saved region and V2 unified is enabled.
 * This preloads ramps data for faster UX when the user navigates to buy/sell flows.
 *
 * Should be called from a top-level component like Wallet that mounts early.
 */
export function useHydrateRampsController(): void {
  const userRegion = useSelector(selectUserRegion);
  const isV2UnifiedEnabled = useRampsUnifiedV2Enabled();

  useEffect(() => {
    if (isV2UnifiedEnabled && userRegion?.regionCode) {
      const { RampsController } = Engine.context;
      Promise.resolve(RampsController.hydrateState()).catch(() => {
        // Error is stored in state
      });
    }
  }, [isV2UnifiedEnabled, userRegion?.regionCode]);
}

export default useHydrateRampsController;
