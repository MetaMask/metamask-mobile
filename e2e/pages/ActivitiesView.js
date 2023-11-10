import TestHelpers from '../helpers';
import { ActivitiesViewSelectorsText } from '../selectors/ActivitiesView.selectors';
import { ActivityViewSelectorsIDs } from '../selectors/ActivityView.selectors';

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

  static async checkActivityTitle(title, index) {
    return expect(
      element(by.id(ActivityViewSelectorsIDs.TITLE)).atIndex(index),
    ).toHaveText(title);
  }

  static async checkActivityStatus(status, index) {
    return expect(
      element(by.id(ActivityViewSelectorsIDs.STATUS)).atIndex(index),
    ).toHaveText(status);
  }
}
