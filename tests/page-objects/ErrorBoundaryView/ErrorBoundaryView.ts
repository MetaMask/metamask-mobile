import Matchers from '../../framework/Matchers';
import { ErrorBoundarySelectorsText } from '../../selectors/ErrorBoundary/ErrorBoundaryView.selectors';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../framework/UnifiedGestures';

class ErrorBoundaryView {
  get title(): EncapsulatedElementType {
    return encapsulated({
      detox: () => Matchers.getElementByText(ErrorBoundarySelectorsText.TITLE),
      appium: () =>
        PlaywrightMatchers.getElementByText(ErrorBoundarySelectorsText.TITLE),
    });
  }

  get srpLinkText(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(
          ErrorBoundarySelectorsText.SAVE_YOUR_SRP_TEXT,
        ),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          ErrorBoundarySelectorsText.SAVE_YOUR_SRP_TEXT,
        ),
    });
  }

  async tapSRPLinkText(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.srpLinkText, {
      elemDescription: 'SRP link text',
    });
  }
}

export default new ErrorBoundaryView();
