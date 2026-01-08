import { ControllerInitFunction } from '../types';
import {
  TokenDetectionController,
  type TokenDetectionControllerMessenger,
} from '@metamask/assets-controllers';
import { TokenDetectionControllerInitMessenger } from '../messengers/token-detection-controller-messenger';
import { MetaMetrics, MetaMetricsEvents } from '../../Analytics';
import { MetricsEventBuilder } from '../../Analytics/MetricsEventBuilder';
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

  const controller = new TokenDetectionController({
    messenger: controllerMessenger,
    disabled: false,
    getBalancesInSingleCall: initMessenger.call.bind(
      initMessenger,
      'AssetsContractController:getBalancesInSingleCall',
    ),
    useTokenDetection: () => selectUseTokenDetection(getState()),
    useExternalServices: () => selectBasicFunctionalityEnabled(getState()),
    trackMetaMetricsEvent: () =>
      MetaMetrics.getInstance().trackEvent(
        MetricsEventBuilder.createEventBuilder(MetaMetricsEvents.TOKEN_DETECTED)
          .addProperties({
            token_standard: 'ERC20',
            asset_type: 'token',
            chain_id: getDecimalChainId(getGlobalChainId(networkController)),
          })
          .build(),
      ),
  });

  return {
    controller,
  };
};
