import Assertions from '../../framework/Assertions';
import { PredictConnectionErrorSelectorsIDs } from '../../../app/components/UI/Predict/Predict.testIds';
import { type AppiumElement } from '../../framework';
import Matchers from '../../framework/Matchers';

class PredictConnectionErrorView {
  get title(): Promise<AppiumElement> {
    return Matchers.getElementByText(
      PredictConnectionErrorSelectorsIDs.TITLE_TEXT,
    );
  }

  get retryButton(): Promise<AppiumElement> {
    return Matchers.getElementByText(
      PredictConnectionErrorSelectorsIDs.RETRY_TEXT,
    );
  }

  async expectVisible(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.title, {
      description: 'Predict connection error title visible',
    });
    await Assertions.expectElementToBeVisible(this.retryButton, {
      description: 'Predict connection error Try again visible',
    });
  }
}

export default new PredictConnectionErrorView();
