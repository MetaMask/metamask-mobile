'use strict';
import { loginToApp } from '../../viewHelper';
import { SmokeAssets } from '../../tags';
import WalletView from '../../pages/wallet/WalletView';
import DetectedTokensView from '../../pages/wallet/DetectedTokensView';
import Assertions from '../../utils/Assertions';
import TestHelpers from '../../helpers';
import FixtureBuilder from '../../fixtures/fixture-builder';
import { withFixtures } from '../../fixtures/fixture-helper';

const ETHEREUM_NAME = 'Ethereum';
const USDC_NAME = 'USDC';

describe(SmokeAssets('Import all tokens detected'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
    await TestHelpers.reverseServerPort();
  });

  it('should import all tokens detected automatically', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();

        await Assertions.checkIfVisible(WalletView.container);
        const eth = WalletView.tokenInWallet(ETHEREUM_NAME);
        const usdc = WalletView.tokenInWallet(USDC_NAME);

        await Assertions.checkIfVisible(eth);
        await Assertions.checkIfVisible(usdc);
      },
    );
  });
});
