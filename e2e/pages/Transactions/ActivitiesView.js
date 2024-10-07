import { ActivitiesViewSelectorsIDs, ActivitiesViewSelectorsText } from '../../selectors/Transactions/ActivitiesView.selectors';
import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';

class ActivitiesView {
  get title() {
    return Matchers.getElementByText(ActivitiesViewSelectorsText.TITLE);
  }

  get container() {
    return Matchers.getElementByID(
      ActivitiesViewSelectorsIDs.CONTAINER,
    );
  }

  generateSwapActivityLabel(sourceToken, destinationToken) {
    let title = ActivitiesViewSelectorsText.SWAP;
    title = title.replace('{{sourceToken}}', sourceToken);
    title = title.replace('{{destinationToken}}', destinationToken);
    return title;
  }

  generateApprovedTokenActivityLabel(sourceToken) {
    let title = ActivitiesViewSelectorsText.APPROVE;
    title = title.replace('{{sourceToken}}', sourceToken);
    title = title.replace('{{upTo}}', '.*');
    return new RegExp(`^${title}`);
  }

  swapActivity(sourceToken, destinationToken) {
    return Matchers.getElementByText(
      this.generateSwapActivityLabel(sourceToken, destinationToken),
    );
  }

  approveTokenActivity(sourceToken) {
    return Matchers.getElementByText(
      this.generateApprovedTokenActivityLabel(sourceToken),
    );
  }

  async tapOnSwapActivity(sourceToken, destinationToken) {
    const element = this.swapActivity(sourceToken, destinationToken);
    await Gestures.waitAndTap(element);
  }

  async swipeDown() {
    await Gestures.swipe(this.container, 'down', 'slow', 0.5);
  }
}

export default new ActivitiesView();
