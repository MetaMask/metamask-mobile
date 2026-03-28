import Assertions from '../../framework/Assertions';
import WalletView from '../wallet/WalletView';

class TronAccountView {
  async checkSelectedNetworkIsVisible() {
    await Assertions.expectElementToHaveText(
      WalletView.navbarNetworkText,
      'Tron Mainnet',
      {
        description: 'selected Tron network should be visible in the navbar',
      },
    );
  }
}

export default new TronAccountView();
