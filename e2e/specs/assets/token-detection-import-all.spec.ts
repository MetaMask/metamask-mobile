'use strict';
import { loginToApp } from '../../viewHelper';
import { RegressionAssets } from '../../tags';
import WalletView from '../../pages/wallet/WalletView';
import Assertions from '../../framework/Assertions';
import TestHelpers from '../../helpers';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';

const ETHEREUM_NAME = 'Ethereum';
const USDC_NAME = 'USDCoin';

describe(RegressionAssets('Import all tokens detected'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
    await TestHelpers.reverseServerPort();
  });

  it('should import all tokens detected automatically', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withDetectedTokens([
            {
              address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
              decimals: 18,
              symbol: 'USDC',
              chainId: '0x1',
              name: 'USDCoin',
            },
          ])
          .build(),
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
