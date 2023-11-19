import TestHelpers from '../helpers';
import { ActivitiesViewSelectorsText } from '../selectors/ActivitiesView.selectors';

export default class ActivitiesView {
  static async isVisible() {
    await TestHelpers.checkIfElementWithTextIsVisible(
      ActivitiesViewSelectorsText.TITLE,
    );
  }

  static async tapOnSwapActivity(sourceToken, destinationToken) {
    let title = ActivitiesViewSelectorsText.SWAP;
    title = title.replace('{{sourceToken}}', sourceToken);
    title = title.replace('{{destinationToken}}', destinationToken);
    await TestHelpers.waitAndTapText(title);
  }
}
