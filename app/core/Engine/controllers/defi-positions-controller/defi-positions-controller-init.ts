import {
  DeFiPositionsController,
  DeFiPositionsControllerMessenger,
} from '@metamask/assets-controllers';
import type { ControllerInitFunction } from '../../types';
import { DeFiPositionsControllerInitMessenger } from '../../messengers/defi-positions-controller-messenger/defi-positions-controller-messenger';
import { store } from '../../../../store';
import { selectBasicFunctionalityEnabled } from '../../../../selectors/settings';
import { AnalyticsEventBuilder } from '../../../../util/analytics/AnalyticsEventBuilder';
import {
  DEFAULT_FEATURE_FLAG_VALUES,
  FeatureFlagNames,
} from '../../../../constants/featureFlags';

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

      const assetsDefiPositionsEnabled = Boolean(
        initMessenger.call('RemoteFeatureFlagController:getState')
          ?.remoteFeatureFlags?.[FeatureFlagNames.assetsDefiPositionsEnabled] ??
          DEFAULT_FEATURE_FLAG_VALUES[
            FeatureFlagNames.assetsDefiPositionsEnabled
          ],
      );

      return isBasicFunctionalityToggleEnabled && assetsDefiPositionsEnabled;
    },
    trackEvent: (params: {
      event: string;
      properties?: Record<string, unknown>;
    }) => {
      try {
        const event = AnalyticsEventBuilder.createEventBuilder(params.event)
          .addProperties(params.properties)
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
