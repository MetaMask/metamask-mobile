import TestHelpers from '../../helpers';
import messages from '../../../locales/languages/en.json';

export default class Onboarding {
  static async tapStartSwapping() {
    await TestHelpers.waitAndTapText(messages.swaps.onboarding.start_swapping);
  }
}
