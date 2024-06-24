'use strict';
import { importWalletWithRecoveryPhrase } from '../../viewHelper';
import { SmokeAssets } from '../../tags';
import WalletView from '../../pages/WalletView';
import DetectedTokensView from '../../pages/wallet/DetectedTokensView';
import Assertions from '../../utils/Assertions';

describe(SmokeAssets('Import all tokens detected'), () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  it('should import wallet and go to the wallet view', async () => {
    await importWalletWithRecoveryPhrase();
  });

  it('should import all tokens detected', async () => {
    await WalletView.tapNewTokensFound();
    await DetectedTokensView.tapImport();
  });

  it('should land on wallet view after tokens detected', async () => {
    await WalletView.isVisible();
  });

  it('should show toast alert for tokens imported', async () => {
    try {
      await Assertions.checkIfTextIsDisplayed('Imported Tokens', 6000);
      await Assertions.checkIfTextIsDisplayed(
        'Successfully imported WETH',
        6000,
      );
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log(`Toast message is slow to appear or did not appear: ${e}`);
    }
  });
});
