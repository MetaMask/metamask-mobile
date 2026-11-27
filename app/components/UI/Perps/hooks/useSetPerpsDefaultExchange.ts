import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import {
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
  type PerpsProviderType,
} from '@metamask/perps-controller';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import Engine from '../../../../core/Engine';
import { selectPerpsDefaultProvider } from '../selectors/perpsController';
import { usePerpsEventTracking } from './usePerpsEventTracking';

/**
 * Persists the default exchange with `setDefaultProvider`.
 *
 * That call updates aggregated routing in place. It does not reinitialize
 * transports the way `switchProvider` does.
 *
 * @returns Setter. Returns true when the controller accepted the venue.
 * An interaction event fires only when that accepted venue id changes.
 */
export function useSetPerpsDefaultExchange(): (
  providerId: PerpsProviderType,
) => boolean {
  const savedDefault = useSelector(selectPerpsDefaultProvider);
  const { track } = usePerpsEventTracking();

  return useCallback(
    (providerId: PerpsProviderType): boolean => {
      const result =
        Engine.context.PerpsController.setDefaultProvider(providerId);
      if (!result.success || savedDefault === providerId) {
        return result.success;
      }
      track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
        [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
          // TAT-4388 names this value. The catalog alias is for leverage only.
          // oxlint-disable-next-line typescript/no-deprecated
          PERPS_EVENT_VALUE.INTERACTION_TYPE.SETTING_CHANGED,
        [PERPS_EVENT_PROPERTY.PROVIDER]: providerId,
      });
      return true;
    },
    [savedDefault, track],
  );
}
