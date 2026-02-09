import Matchers from '../../framework/Matchers.ts';
import Gestures from '../../framework/Gestures.ts';
import { ErrorBoundarySelectorsText } from '../../selectors/ErrorBoundary/ErrorBoundaryView.selectors.ts';

class ErrorBoundaryView {
  get title(): DetoxElement {
    return Matchers.getElementByText(ErrorBoundarySelectorsText.TITLE);
  }

  get srpLinkText(): DetoxElement {
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
