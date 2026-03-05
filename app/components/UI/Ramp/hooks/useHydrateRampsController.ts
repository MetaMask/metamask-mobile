import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { selectUserRegion } from '../../../../selectors/rampsController';
import useRampsUnifiedV2Enabled from './useRampsUnifiedV2Enabled';

const BACKUP_INIT_DELAY_MS = 5000;

/**
 * Backup init for RampsController when Engine init may not have run or completed.
 *
 * When V2 is enabled and userRegion is still null after a delay, calls controller.init()
 * once. Engine (rampsControllerInit) is the primary init; this handles edge cases where
 * the React tree mounts before Engine finishes. init() is idempotent so duplicate
 * calls are safe.
 *
 * Should be called from a top-level component that mounts early (e.g. RampsBootstrap).
 */
export function useHydrateRampsController(): void {
  const userRegion = useSelector(selectUserRegion);
  const isV2UnifiedEnabled = useRampsUnifiedV2Enabled();

  useEffect(() => {
    if (!isV2UnifiedEnabled || userRegion?.regionCode) {
      return;
    }

    const timeoutId = setTimeout(() => {
      const { RampsController } = Engine.context;
      if (RampsController.state.userRegion?.regionCode) {
        return;
      }
      RampsController.init()
        .then(() => {
          RampsController.startOrderPolling();
        })
        .catch(() => {
          // Error is stored in state
        });
    }, BACKUP_INIT_DELAY_MS);

    return () => clearTimeout(timeoutId);
  }, [isV2UnifiedEnabled, userRegion?.regionCode]);
}

export default useHydrateRampsController;
