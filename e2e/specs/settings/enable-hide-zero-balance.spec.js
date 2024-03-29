'use strict';
import TestHelpers from '../../helpers';
import { SmokeCore } from '../../tags';

import SettingsView from '../../pages/Settings/SettingsView';

import { loginToApp } from '../../viewHelper';
import TabBarComponent from '../../pages/TabBarComponent';
import FixtureBuilder from '../../fixtures/fixture-builder';
import {
  withFixtures,
  defaultGanacheOptions,
} from '../../fixtures/fixture-helper';
import CommonView from '../../pages/CommonView';
import Assertions from '../../utils/Assertions';
import ImportTokensView from '../../pages/ImportTokensView';
import WalletView from '../../pages/WalletView';
import GeneralView from '../../pages/Settings/GeneralView';
import Matchers from '../../utils/Matchers';
import Networks from '../../resources/networks.json';

const TOKEN_NAME = 'LINK';
describe(SmokeCore('enables hide tokens with zero balance'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
    await TestHelpers.reverseServerPort();
  });

  it('should hide zero balance tokens', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withTokensController({
            allDetectedTokens: {},
            allIgnoredTokens: {},
            allTokens: {
              '0x1': {
                '0x76cf1cdd1fcc252442b50d6e97207228aa4aefc3': [
                  {
                    address: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
                    decimals: 18,
                    image: null,
                    isERC721: false,
                    name: 'Chainlink Token',
                    symbol: 'LINK',
                  },
                ],
              },
              '0x539': {
                '0x76cf1CdD1fcC252442b50D6e97207228aA4aefC3': [
                  {
                    address: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
                    decimals: 18,
                    image: null,
                    isERC721: false,
                    name: 'Chainlink Token',
                    symbol: 'LINK',
                  },
                ],
              },
            },
            detectedTokens: [],
            ignoredTokens: [],
            tokens: [
              {
                address: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
                decimals: 18,
                image: null,
                isERC721: false,
                name: 'Chainlink Token',
                symbol: 'LINK',
              },
            ],
          })
          .withNetworkController(Networks.Tenderly)
          .build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();

        await Assertions.checkIfNotVisible(
          Matchers.getElementByText(TOKEN_NAME),
        );

        // should go to settings then security & privacy
        await TabBarComponent.tapSettings();
        await SettingsView.tapGeneralSettings();

        await GeneralView.scrollToHideTokensToggle();
        await GeneralView.toggleHideZeroBalance();
        await Assertions.checkIfToggleIsOn(GeneralView.hideTokenBalanceToggle);

        await TabBarComponent.tapWallet();

        await Assertions.checkIfNotVisible(
          Matchers.getElementByText(TOKEN_NAME),
        );
      },
    );
  });
});
