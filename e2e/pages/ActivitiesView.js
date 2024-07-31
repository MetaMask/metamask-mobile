import Gestures from '../utils/Gestures';
import Matchers from '../utils/Matchers';
import { ActivitiesViewSelectorsText } from '../selectors/ActivitiesView.selectors';

class ActivitiesView {
  get title() {
    return Matchers.getElementByText(ActivitiesViewSelectorsText.TITLE);
  }

  async isVisible() {
    await Matchers.checkIfVisible(this.title);
  }

  async tapOnSwapActivity(sourceToken, destinationToken) {
    let title = ActivitiesViewSelectorsText.SWAP;
    title = title.replace('{{sourceToken}}', sourceToken);
    title = title.replace('{{destinationToken}}', destinationToken);
    const selector = Matchers.getElementByText(title);
    await Gestures.waitAndTap(selector);
  }
}

export default new ActivitiesView();
