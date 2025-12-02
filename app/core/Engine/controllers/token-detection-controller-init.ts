import { ControllerInitFunction } from '../types';
import {
  TokenDetectionController,
  type TokenDetectionControllerMessenger,
} from '@metamask/assets-controllers';
import { TokenDetectionControllerInitMessenger } from '../messengers/token-detection-controller-messenger';
import { EVENT_NAME } from '../../Analytics/MetaMetrics.events';
import { AnalyticsEventBuilder } from '../../Analytics/AnalyticsEventBuilder';
import { getDecimalChainId } from '../../../util/networks';
import { getGlobalChainId } from '../../../util/networks/global-network';
import { selectUseTokenDetection } from '../../../selectors/preferencesController';
import { selectBasicFunctionalityEnabled } from '../../../selectors/settings';
import type { AnalyticsTrackingEvent } from '@metamask/analytics-controller';

/**
 * Initialize the tokenDetection controller.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the controller.
 * @returns The initialized controller.
 */
export const tokenDetectionControllerInit: ControllerInitFunction<
  TokenDetectionController,
  TokenDetectionControllerMessenger,
  TokenDetectionControllerInitMessenger
> = ({ controllerMessenger, initMessenger, getController, getState }) => {
  const networkController = getController('NetworkController');

  const controller = new TokenDetectionController({
    messenger: controllerMessenger,
    platform: 'mobile',
    useAccountsAPI: true,
    disabled: false,
    getBalancesInSingleCall: initMessenger.call.bind(
      initMessenger,
      'AssetsContractController:getBalancesInSingleCall',
    ),
    useTokenDetection: () => selectUseTokenDetection(getState()),
    useExternalServices: () => selectBasicFunctionalityEnabled(getState()),
    trackMetaMetricsEvent: () => {
      const event = AnalyticsEventBuilder.createEventBuilder(
        EVENT_NAME.TOKEN_DETECTED,
      )
        .addProperties({
          token_standard: 'ERC20',
          asset_type: 'token',
          chain_id: getDecimalChainId(getGlobalChainId(networkController)),
        })
        .build();
      (
        initMessenger.call as unknown as (
          action: 'AnalyticsController:trackEvent',
          event: AnalyticsTrackingEvent,
        ) => void
      )('AnalyticsController:trackEvent', event);
    },
  });

  return {
    controller,
  };
};
