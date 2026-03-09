import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { selectUserRegion } from '../../../../selectors/rampsController';
import useRampsUnifiedV2Enabled from './useRampsUnifiedV2Enabled';

/**
 * Hook that ensures RampsController has tokens (and providers) loaded.
 *
 * - When V2 is enabled and userRegion is set: calls hydrateState() to refresh
 * tokens and providers (e.g. when region is already loaded from persistence).
 * - When V2 is enabled and userRegion is null: calls controller.init() once so
 * tokens load when the Ramp UI mounts (backup if Engine init hasn't run or
 * completed yet). Uses a ref to avoid duplicate in-flight init.
 *
 * Should be called from a top-level component that mounts early (e.g. FiatOrders in Main nav).
 */
export function useHydrateRampsController(): void {
  const userRegion = useSelector(selectUserRegion);
  const isV2UnifiedEnabled = useRampsUnifiedV2Enabled();
  const hasTriggeredInitRef = useRef(false);

  useEffect(() => {
    if (!isV2UnifiedEnabled) {
      return;
    }

    const { RampsController } = Engine.context;

    if (userRegion?.regionCode) {
      Promise.resolve(RampsController.hydrateState()).catch(() => {
        // Error is stored in state
      });
      return;
    }

    // userRegion is null: ensure init runs so tokens load when Ramp UI is shown
    // (backup to Engine init, which may not have run or completed yet).
    if (!hasTriggeredInitRef.current) {
      hasTriggeredInitRef.current = true;
      Promise.resolve(RampsController.init())
        .then(() => {
          RampsController.startOrderPolling();
        })
        .catch(() => {
          hasTriggeredInitRef.current = false;
        });
    }
  }, [isV2UnifiedEnabled, userRegion?.regionCode]);
}

export default useHydrateRampsController;
