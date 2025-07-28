'use strict';
import { loginToApp } from '../../viewHelper';
import { SmokeNetworkAbstractions } from '../../tags';
import WalletView from '../../pages/wallet/WalletView';
import Assertions from '../../framework/Assertions';
import TestHelpers from '../../helpers';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { defaultGanacheOptions } from '../../framework/Constants';
import { LocalNodeType } from '../../framework/types';

const ETHEREUM_NAME = 'Ethereum';
const USDC_NAME = 'USD Coin';

// USDC token configuration for Ethereum Mainnet
const USDC_TOKEN = {
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': {
    address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    symbol: 'USDC',
    decimals: 6,
    name: 'USD Coin',
    iconUrl:
      'https://static.cx.metamask.io/api/v1/tokenIcons/1/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png',
    type: 'erc20',
    aggregators: [
      'Coinmarketcap',
      'Coingecko',
      '1inch',
      'PMM',
      'Zapper',
      'Zerion',
      'Lifi',
    ],
    occurrences: 7,
  },
};

describe(SmokeNetworkAbstractions('Import all tokens detected'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
    await TestHelpers.reverseServerPort();
  });

  it('should import all tokens detected automatically', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withTokens(USDC_TOKEN).build(),
        restartDevice: true,
        localNodeOptions: [
          {
            type: LocalNodeType.ganache,
            options: defaultGanacheOptions,
          },
        ],
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
