import TestHelpers from '../../helpers';
import enContent from '../../../locales/languages/en.json';

export default class Onboarding {
  static async tapStartSwapping() {
    await TestHelpers.waitAndTapText(enContent.swaps.onboarding.start_swapping);
  }
}
