import {
  DeFiPositionsController,
  DeFiPositionsControllerMessenger,
} from '@metamask/assets-controllers';
import type { MessengerClientInitFunction } from '../../types';
import { DeFiPositionsControllerInitMessenger } from '../../messengers/defi-positions-controller-messenger/defi-positions-controller-messenger';
import { store } from '../../../../store';
import { selectBasicFunctionalityEnabled } from '../../../../selectors/settings';
import { selectDefiControllerV2Enabled } from '../../../../selectors/featureFlagController/defiControllerV2';
import { AnalyticsEventBuilder } from '../../../../util/analytics/AnalyticsEventBuilder';
import type { AnalyticsTrackingEvent as PackageAnalyticsTrackingEvent } from '@metamask/analytics-controller';

/**
 * Initialize the DeFiPositionsController (V1).
 *
 * Enabled only when V2 is off: the two controllers are mutually exclusive via
 * {@link selectDefiControllerV2Enabled}.
 *
 * @param request - The request object.
 * @returns The DeFiPositionsController.
 */
export const defiPositionsControllerInit: MessengerClientInitFunction<
  DeFiPositionsController,
  DeFiPositionsControllerMessenger,
  DeFiPositionsControllerInitMessenger
> = (request) => {
  const { initMessenger, controllerMessenger } = request;

  const controller = new DeFiPositionsController({
    messenger: controllerMessenger,
    isEnabled: () => {
      const isBasicFunctionalityToggleEnabled = selectBasicFunctionalityEnabled(
        store.getState(),
      );
      const isV2Enabled = selectDefiControllerV2Enabled(store.getState());

      return isBasicFunctionalityToggleEnabled && !isV2Enabled;
    },
    trackEvent: (params: {
      event: string;
      properties?: Record<string, unknown>;
    }) => {
      try {
        const event = AnalyticsEventBuilder.createEventBuilder(params.event)
          .addProperties(params.properties)
          .build();

        // Cast needed until @metamask/analytics-controller removes saveDataRecording from its AnalyticsTrackingEvent
        initMessenger.call(
          'AnalyticsController:trackEvent',
          event as unknown as PackageAnalyticsTrackingEvent,
        );
      } catch (error) {
        // Analytics tracking failures should not break DeFi positions functionality
        // Error is logged but not thrown
      }
    },
  });

  return { controller };
};
