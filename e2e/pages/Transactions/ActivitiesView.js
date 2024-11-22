import { ActivitiesViewSelectorsIDs, ActivitiesViewSelectorsText } from '../../selectors/Transactions/ActivitiesView.selectors';
import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';
import { CommonSelectorsIDs } from '../../selectors/Common.selectors';

class ActivitiesView {
  static FIRST_ROW = 0;
  static SECOND_ROW = 1;

  get title() {
    return Matchers.getElementByText(ActivitiesViewSelectorsText.TITLE);
  }

  get container() {
    return Matchers.getElementByID(
      ActivitiesViewSelectorsIDs.CONTAINER,
    );
  }

  get confirmedLabel() {
    return Matchers.getElementByText(ActivitiesViewSelectorsText.CONFIRM_TEXT);
  }

  get firstTransactionStatus() {
    return element(by.id(CommonSelectorsIDs.TRANSACTION_STATUS)).atIndex(ActivitiesView.FIRST_ROW);
  }

  get secondTransactionStatus() {
    return element(by.id(CommonSelectorsIDs.TRANSACTION_STATUS)).atIndex(ActivitiesView.SECOND_ROW);
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

  swapActivityTitle(sourceToken, destinationToken) {
    return Matchers.getElementByText(
      this.generateSwapActivityLabel(sourceToken, destinationToken),
    );
  }

  tokenApprovalActivity(sourceToken) {
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
