import Assertions from '../../framework/Assertions';
import Matchers from '../../framework/Matchers';
import { ToastSelectorsIDs } from '../../../app/component-library/components/Toast/ToastModal.testIds';
import { PredictConnectionErrorSelectorsIDs } from '../../../app/components/UI/Predict/Predict.testIds';
import { type AppiumElement } from '../../framework';

class PredictConnectionErrorView {
  get toast(): Promise<AppiumElement> {
    return Matchers.getElementByID(ToastSelectorsIDs.CONTAINER);
  }

  get retryButton(): Promise<AppiumElement> {
    return Matchers.getElementByText(
      PredictConnectionErrorSelectorsIDs.RETRY_TEXT,
    );
  }

  async expectVisible(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.toast, {
      description: 'Predict connection error toast visible',
    });
    await Assertions.expectElementToBeVisible(this.retryButton, {
      description: 'Predict connection error Try again visible',
    });
  }
}

export default new PredictConnectionErrorView();
