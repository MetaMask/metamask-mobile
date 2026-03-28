import TokenOverview from '../wallet/TokenOverview';

class TronAccountView {
  async tapSendButton(): Promise<void> {
    await TokenOverview.tapSendButton();
  }
}

export default new TronAccountView();
