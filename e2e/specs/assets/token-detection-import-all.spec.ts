'use strict';
import { loginToApp } from '../../viewHelper';
import { SmokeNetworkAbstractions } from '../../tags';
import WalletView from '../../pages/wallet/WalletView';
import Assertions from '../../framework/Assertions';
import TestHelpers from '../../helpers';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';

const ETHEREUM_NAME = 'Ethereum';
const USDC_NAME = 'USDCoin';

describe(SmokeNetworkAbstractions('Import all tokens detected'), () => {
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

        await Assertions.expectElementToBeVisible(WalletView.container);
        const eth = WalletView.tokenInWallet(ETHEREUM_NAME);
        const usdc = WalletView.tokenInWallet(USDC_NAME);

        await Assertions.expectElementToBeVisible(eth);
        await Assertions.expectElementToBeVisible(usdc);
      },
    );
  });
});
