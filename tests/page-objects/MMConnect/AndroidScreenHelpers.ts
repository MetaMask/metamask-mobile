import {
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../framework/UnifiedGestures';

class AndroidScreenHelpers {
  get openDeeplinkWithMetaMask(): EncapsulatedElementType {
    return encapsulated({
      appium: () =>
        PlaywrightMatchers.getElementByXPath(
          '//android.widget.TextView[@text="MetaMask"]',
        ),
    });
  }

  async tapOpenDeeplinkWithMetaMask(): Promise<void> {
    await UnifiedGestures.tap(this.openDeeplinkWithMetaMask);
  }
}

export default new AndroidScreenHelpers();
