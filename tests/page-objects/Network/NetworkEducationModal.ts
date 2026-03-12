import {
  NetworkEducationModalSelectorsIDs,
  NetworkEducationModalSelectorsText,
} from '../../../app/components/UI/NetworkInfo/NetworkEducationModal.testIds';
import Matchers from '../../framework/Matchers';
import UnifiedGestures from '../../framework/UnifiedGestures';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';

class NetworkEducationModal {
  get container(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(NetworkEducationModalSelectorsIDs.CONTAINER),
      appium: {
        android: () =>
          PlaywrightMatchers.getElementById(
            NetworkEducationModalSelectorsIDs.CONTAINER,
            { exact: true },
          ),
        ios: () =>
          PlaywrightMatchers.getElementByAccessibilityId(
            NetworkEducationModalSelectorsIDs.CONTAINER,
          ),
      },
    });
  }

  get closeButton(): EncapsulatedElementType {
    return encapsulated({
      // Android Detox: testID may not be exposed for StyledButton; use label. iOS: use testID.
      detox: () =>
        device.getPlatform() === 'android'
          ? Matchers.getElementByLabel(
              NetworkEducationModalSelectorsText.GOT_IT,
            )
          : Matchers.getElementByID(
              NetworkEducationModalSelectorsIDs.CLOSE_BUTTON,
            ),
      appium: {
        android: () =>
          PlaywrightMatchers.getElementById(
            NetworkEducationModalSelectorsIDs.CLOSE_BUTTON,
            { exact: true },
          ),
        ios: () =>
          PlaywrightMatchers.getElementByAccessibilityId(
            NetworkEducationModalSelectorsIDs.CLOSE_BUTTON,
          ),
      },
    });
  }

  get addToken(): DetoxElement {
    return Matchers.getElementByText(
      NetworkEducationModalSelectorsText.ADD_TOKEN,
    );
  }

  /** Network name - wdio uses networkEducationNetworkName */
  get networkName(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(NetworkEducationModalSelectorsIDs.NETWORK_NAME),
      appium: () =>
        PlaywrightMatchers.getElementById(
          NetworkEducationModalSelectorsIDs.NETWORK_NAME,
          { exact: true },
        ),
    });
  }

  async tapGotItButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.closeButton, {
      description: 'Got it button',
    });
  }

  async tapNetworkName(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.networkName, {
      description: 'Network name',
    });
  }
}

export default new NetworkEducationModal();
