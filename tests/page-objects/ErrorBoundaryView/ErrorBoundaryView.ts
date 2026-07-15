import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { ErrorBoundarySelectorsText } from '../../selectors/ErrorBoundary/ErrorBoundaryView.selectors';
import { EncapsulatedElementType } from '../../framework';

class ErrorBoundaryView {
  get title(): EncapsulatedElementType {
    return Matchers.getElementByText(ErrorBoundarySelectorsText.TITLE);
  }

  get srpLinkText(): EncapsulatedElementType {
    return Matchers.getElementByText(
      ErrorBoundarySelectorsText.SAVE_YOUR_SRP_TEXT,
    );
  }

  async tapSRPLinkText(): Promise<void> {
    await Gestures.waitAndTap(this.srpLinkText, {
      elemDescription: 'SRP link text',
    });
  }
}

export default new ErrorBoundaryView();
