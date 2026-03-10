import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { selectUserRegion } from '../../../../selectors/rampsController';
import useRampsUnifiedV2Enabled from './useRampsUnifiedV2Enabled';

const BACKUP_INIT_DELAY_MS = 5000;

/**
 * Backup init for RampsController when Engine init may not have run or completed.
 *
 * When V2 is enabled: if userRegion exists (e.g. restored from persistence),
 * calls init() immediately so tokens/providers load. If userRegion is null,
 * schedules init() after a delay as a backup. init() is idempotent.
 * Should be called from a top-level component that mounts early (e.g. RampsBootstrap).
 */
export function useHydrateRampsController(): void {
  const userRegion = useSelector(selectUserRegion);
  const isV2UnifiedEnabled = useRampsUnifiedV2Enabled();

  useEffect(() => {
    if (!isV2UnifiedEnabled) {
      return;
    }

    const { RampsController } = Engine.context;

    if (userRegion?.regionCode) {
      RampsController.init()
        .then(() => {
          RampsController.startOrderPolling();
        })
        .catch(() => {
          // Error is stored in state
        });
      return;
    }

    const timeoutId = setTimeout(() => {
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
