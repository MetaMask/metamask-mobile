import TestHelpers from '../helpers';

export default class TabBarComponent {
  static async tapBrowser() {
    await TestHelpers.tapByText('Browser');
    await TestHelpers.delay(1000);
  }
  static async tapWallet() {
    await TestHelpers.tapByText('Wallet');
  }
}
