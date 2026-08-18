import AppConstants from '../../../../core/AppConstants';
import SharedDeeplinkManager from '../../../../core/DeeplinkManager/DeeplinkManager';
import Logger from '../../../../util/Logger';
import type { UiSlotActionRegistry } from '../../UiSlots/handlers/handlerRegistry';
import { isAllowedPredictDeeplink } from '../utils/isAllowedPredictDeeplink';

export const PREDICT_UI_SLOT_ACTION_REGISTRY = {
  'navigate-deeplink': (_slot, action) => {
    if (
      action.actionId !== 'navigate-deeplink' ||
      !isAllowedPredictDeeplink(action.params.deeplink)
    ) {
      return;
    }

    SharedDeeplinkManager.getInstance()
      .parse(action.params.deeplink, {
        origin: AppConstants.DEEPLINKS.ORIGIN_CAROUSEL,
      })
      .catch((error) => {
        Logger.error(
          error instanceof Error
            ? error
            : new Error('UI Slots deeplink action failed.'),
        );
      });
  },
} satisfies UiSlotActionRegistry;
