import {
  DeFiPositionsController,
  DeFiPositionsControllerMessenger,
} from '@metamask/assets-controllers';
import type { ControllerInitFunction } from '../../types';
import { DeFiPositionsControllerInitMessenger } from '../../messengers/defi-positions-controller-messenger/defi-positions-controller-messenger';
import { store } from '../../../../store';
import { selectBasicFunctionalityEnabled } from '../../../../selectors/settings';
import { AnalyticsEventBuilder } from '../../../../util/analytics/AnalyticsEventBuilder';
import type { AnalyticsEventProperties } from '@metamask/analytics-controller';

/**
 * Initialize the DeFiPositionsController.
 *
 * @param request - The request object.
 * @returns The DeFiPositionsController.
 */
export const defiPositionsControllerInit: ControllerInitFunction<
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

      const featureFlagForDeFi = Boolean(
        initMessenger.call('RemoteFeatureFlagController:getState')
          ?.remoteFeatureFlags?.assetsDefiPositionsEnabled,
      );

      return isBasicFunctionalityToggleEnabled && featureFlagForDeFi;
    },
    trackEvent: (params: {
      event: string;
      properties?: Record<string, unknown>;
    }) => {
      try {
        const event = AnalyticsEventBuilder.createEventBuilder(params.event)
          .addProperties((params.properties as AnalyticsEventProperties) || {})
          .build();

        initMessenger.call('AnalyticsController:trackEvent', event);
      } catch (error) {
        // Analytics tracking failures should not break DeFi positions functionality
        // Error is logged but not thrown
      }
    },
  });

  return { controller };
};
