import TestHelpers from '../helpers';
import messages from '../../locales/languages/en.json';
import { ActivityViewSelectorsIDs } from '../selectors/ActivityView.selectors';

export default class ActivitiesView {
  static async isVisible() {
    await TestHelpers.checkIfElementByTextIsVisible(
      messages.transactions_view.title,
    );
  }

  static async tapActivity(title) {
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
