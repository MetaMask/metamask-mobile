import { ActivitiesViewSelectorsText } from '../../selectors/Transactions/ActivitiesView.selectors';
import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';

class ActivitiesView {
  get title() {
    return Matchers.getElementByText(ActivitiesViewSelectorsText.TITLE);
  }

  generateSwapActivityLabel(sourceToken, destinationToken) {
    let title = ActivitiesViewSelectorsText.SWAP;
    title = title.replace('{{sourceToken}}', sourceToken);
    title = title.replace('{{destinationToken}}', destinationToken);
    return title;
  }

  swapActivity(sourceToken, destinationToken) {
    return Matchers.getElementByText(
      this.generateSwapActivityLabel(sourceToken, destinationToken),
    );
  }

  async tapOnSwapActivity(sourceToken, destinationToken) {
    const element = this.swapActivity(sourceToken, destinationToken);
    await Gestures.waitAndTap(element);
  }
}

export default new ActivitiesView();
