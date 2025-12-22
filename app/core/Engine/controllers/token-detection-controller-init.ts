import { ControllerInitFunction } from '../types';
import {
  TokenDetectionController,
  type TokenDetectionControllerMessenger,
  type AssetsContractControllerGetBalancesInSingleCallAction,
} from '@metamask/assets-controllers';
import { TokenDetectionControllerInitMessenger } from '../messengers/token-detection-controller-messenger';
import { MetaMetricsEvents } from '../../Analytics';
import { AnalyticsEventBuilder } from '../../../util/analytics/AnalyticsEventBuilder';
import { getDecimalChainId } from '../../../util/networks';
import { getGlobalChainId } from '../../../util/networks/global-network';
import { selectUseTokenDetection } from '../../../selectors/preferencesController';
import { selectBasicFunctionalityEnabled } from '../../../selectors/settings';

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

  const getBalancesInSingleCall = (
    selectedAddress: string,
    tokensToDetect: string[],
    networkClientId?: string,
  ) =>
    initMessenger.call(
      'AssetsContractController:getBalancesInSingleCall',
      selectedAddress,
      tokensToDetect,
      networkClientId,
    ) as ReturnType<
      AssetsContractControllerGetBalancesInSingleCallAction['handler']
    >;

  const controller = new TokenDetectionController({
    messenger: controllerMessenger,
    disabled: false,
    getBalancesInSingleCall,
    useTokenDetection: () => selectUseTokenDetection(getState()),
    useExternalServices: () => selectBasicFunctionalityEnabled(getState()),
    trackMetaMetricsEvent: () => {
      try {
        const event = AnalyticsEventBuilder.createEventBuilder(
          MetaMetricsEvents.TOKEN_DETECTED,
        )
          .addProperties({
            token_standard: 'ERC20',
            asset_type: 'token',
            chain_id: getDecimalChainId(getGlobalChainId(networkController)),
          })
          .build();

        initMessenger.call('AnalyticsController:trackEvent', event);
      } catch (error) {
        // Analytics tracking failures should not break token detection
        // Error is logged but not thrown
      }
    },
  });

  return {
    controller,
  };
};
