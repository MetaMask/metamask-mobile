import TestHelpers from '../helpers';
import messages from '../../locales/languages/en.json';

export default class ActivitiesView {
  static async isVisible() {
    await TestHelpers.checkIfElementWithTextIsVisible(
      messages.transactions_view.title,
    );
  }

  static async tapOnSwapActivity(sourceToken, destinationToken) {
    let title = messages.swaps.transaction_label.swap;
    title = title.replace('{{sourceToken}}', sourceToken);
    title = title.replace('{{destinationToken}}', destinationToken);

    await TestHelpers.waitAndTapText(title);
  }
}
