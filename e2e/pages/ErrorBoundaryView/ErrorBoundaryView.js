import Matchers from '../../framework/Matchers.ts';
import Gestures from '../../framework/Gestures.ts';
import { ErrorBoundarySelectorsText } from '../../selectors/ErrorBoundary/ErrorBoundaryView.selectors';

class ErrorBoundaryView {
  get title() {
    return Matchers.getElementByText(ErrorBoundarySelectorsText.TITLE);
  }

  get srpLinkText() {
    return Matchers.getElementByText(
      ErrorBoundarySelectorsText.SAVE_YOUR_SRP_TEXT,
    );
  }

  async tapSRPLinkText() {
    await Gestures.waitAndTap(this.srpLinkText);
  }
}

export default new ErrorBoundaryView();
