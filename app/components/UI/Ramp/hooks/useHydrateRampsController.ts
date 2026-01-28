import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { selectUserRegion } from '../../../../selectors/rampsController';

/**
 * Hook that hydrates RampsController state (tokens and providers) on mount
 * if the user has a saved region. This preloads ramps data for faster UX
 * when the user navigates to buy/sell flows.
 *
 * Should be called from a top-level component like Wallet that mounts early.
 */
export function useHydrateRampsController(): void {
  const userRegion = useSelector(selectUserRegion);

  useEffect(() => {
    if (userRegion?.regionCode) {
      const { RampsController } = Engine.context;
      RampsController.hydrateState();
    }
  }, [userRegion?.regionCode]);
}

export default useHydrateRampsController;
