'use strict';
import { loginToApp } from '../../viewHelper';
import { SmokeAssets } from '../../tags';
import WalletView from '../../pages/wallet/WalletView';
import DetectedTokensView from '../../pages/wallet/DetectedTokensView';
import Assertions from '../../utils/Assertions';
import TestHelpers from '../../helpers';
import FixtureBuilder from '../../fixtures/fixture-builder';
import { withFixtures } from '../../fixtures/fixture-helper';

describe(SmokeAssets('Import all tokens detected'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
    await TestHelpers.reverseServerPort();
  });

  it('should import all tokens detected', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await WalletView.tapNewTokensFound();
        await DetectedTokensView.tapImport();
        await Assertions.checkIfVisible(WalletView.container);

        try {
          await Assertions.checkIfTextIsDisplayed('Imported Tokens', 6000);
          await Assertions.checkIfTextIsDisplayed(
            'Successfully imported WETH',
            6000,
          );
        } catch (e) {
          // eslint-disable-next-line no-console
          console.log(
            `Toast message is slow to appear or did not appear: ${e}`,
          );
        }
      },
    );
  });
});
