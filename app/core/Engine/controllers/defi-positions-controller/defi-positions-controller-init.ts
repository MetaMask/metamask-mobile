import {
  DeFiPositionsController,
  DeFiPositionsControllerMessenger,
} from '@metamask/assets-controllers';
import type { ControllerInitFunction } from '../../types';
import { DeFiPositionsControllerInitMessenger } from '../../messengers/defi-positions-controller-messenger/defi-positions-controller-messenger';
import { store } from '../../../../store';
import { selectBasicFunctionalityEnabled } from '../../../../selectors/settings';
import { MetaMetrics } from '../../../Analytics';
import { MetricsEventBuilder } from '../../../Analytics/MetricsEventBuilder';

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
      MetaMetrics.getInstance().trackEvent(
        MetricsEventBuilder.createEventBuilder({
          category: params.event,
          properties: params.properties,
        }).build(),
      );
    },
  });

  return { controller };
};
