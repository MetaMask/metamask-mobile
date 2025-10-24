import DevLogger from '../../SDKConnect/utils/DevLogger';
import Logger from '../../../util/Logger';
import { store } from '../../../store';
import { setAlwaysShowCardButton } from '../../../core/redux/slices/card';
import { selectCardExperimentalSwitch } from '../../../selectors/featureFlagController/card';

/**
 * Card deeplink handler to enable the card button
 *
 * This handler enables the card button by setting the alwaysShowCardButton flag
 * to true, but only if the cardExperimentalSwitch feature flag is enabled.
 *
 * Supported URL formats:
 * - https://link.metamask.io/enable-card-button
 * - https://metamask.app.link/enable-card-button
 */
export const handleEnableCardButton = () => {
  DevLogger.log(
    '[handleEnableCardButton] Starting card button enable deeplink handling',
  );

  try {
    const state = store.getState();
    const cardExperimentalSwitchEnabled = selectCardExperimentalSwitch(state);

    DevLogger.log(
      '[handleEnableCardButton] Card experimental switch enabled:',
      cardExperimentalSwitchEnabled,
    );

    if (cardExperimentalSwitchEnabled) {
      store.dispatch(setAlwaysShowCardButton(true));
      DevLogger.log(
        '[handleEnableCardButton] Successfully enabled card button',
      );
      Logger.log('[handleEnableCardButton] Card button enabled via deeplink');
    } else {
      DevLogger.log(
        '[handleEnableCardButton] Card experimental switch is disabled, skipping',
      );
      Logger.log(
        '[handleEnableCardButton] Card experimental switch feature flag is disabled',
      );
    }
  } catch (error) {
    DevLogger.log(
      '[handleEnableCardButton] Failed to enable card button:',
      error,
    );
    Logger.error(
      error as Error,
      '[handleEnableCardButton] Error enabling card button',
    );
  }
};
