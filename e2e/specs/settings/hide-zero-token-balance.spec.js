'use strict';
import { Regression } from '../../tags';
import TestHelpers from '../../helpers';

import SettingsView from '../../pages/Settings/SettingsView';

import { loginToApp } from '../../viewHelper';
import TabBarComponent from '../../pages/TabBarComponent';
import FixtureBuilder from '../../fixtures/fixture-builder';
import {
  withFixtures,
  defaultGanacheOptions,
} from '../../fixtures/fixture-helper';

import Assertions from '../../utils/Assertions';
import WalletView from '../../pages/WalletView';
import GeneralView from '../../pages/Settings/GeneralView';

const TOKEN_SYMBOL = 'TST';

describe(Regression('enables hide tokens with zero balance'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
    await TestHelpers.reverseServerPort();
  });

  it('should hide zero balance tokens', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withTokensController({
            allTokens: {
              ['0x539']: {
                '0x76cf1cdd1fcc252442b50d6e97207228aa4aefc3': [
                  {
                    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
                    decimals: 4,
                    image: null,
                    isERC721: false,
                    symbol: TOKEN_SYMBOL,
                  },
                ],
              },
            },

            tokens: [
              {
                address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
                decimals: 4,
                image: null,
                isERC721: false,
                symbol: TOKEN_SYMBOL,
              },
            ],
          })
          .withGanacheNetwork()
          .build(),
        restartDevice: true,
        ganacheOptions: defaultGanacheOptions,
      },
      async () => {
        const token = WalletView.tokenName(TOKEN_SYMBOL);
        await loginToApp();

        await Assertions.checkIfVisible(token);

        // should go to settings then security & privacy
        await TabBarComponent.tapSettings();
        await SettingsView.tapGeneralSettings();
      },
    );
  });
});
