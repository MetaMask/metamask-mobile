import { IMPORT_WALLET_SCREEN_TITLE_ID } from '../../../app/constants/testIDs/ImportWalletScreen.constants';

class ImportWalletScreen {
  async verifyScreenTitle() {
    await expect(await $(`~${IMPORT_WALLET_SCREEN_TITLE_ID}`)).toBeDisplayed();
  }
}

export default new ImportWalletScreen();
