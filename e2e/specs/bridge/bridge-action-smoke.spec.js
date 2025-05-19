'use strict';
import { loginToApp } from '../../viewHelper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import AdvancedSettingsView from '../../pages/Settings/AdvancedView';
import SettingsView from '../../pages/Settings/SettingsView';
import QuoteView from '../../pages/Bridge/QuoteView';
import FixtureBuilder from '../../fixtures/fixture-builder';
import {
  withFixtures,
  defaultGanacheOptions,
} from '../../fixtures/fixture-helper';
import WalletView from '../../pages/wallet/WalletView';
import TestHelpers from '../../helpers';
import { SmokeTrade } from '../../tags';
import Assertions from '../../utils/Assertions';
import WalletActionsBottomSheet from '../../pages/wallet/WalletActionsBottomSheet';
import { ETH_TO_BASE_URL, ETH_TO_BASE_RESPONSE } from './costants';


describe(SmokeTrade('Bridge from Actions'), () => {
  beforeAll(async () => {
    jest.setTimeout(2500000);
    await TestHelpers.reverseServerPort();
  });

it('should bridge ETH (Mainnet) to ETH (Base Network)', async () => {
  const   testSpecificMock  = {
    GET: [
          {
            urlEndpoint:ETH_TO_BASE_URL,
            response: ETH_TO_BASE_RESPONSE,
            responseCode: 200,
        }
      ]
  };
  await withFixtures(
  {
    fixture: new FixtureBuilder().build(),
    restartDevice: true,
    //.withGanacheNetwork('0x1')
   // ganacheOptions: defaultGanacheOptions,
    //localNodeOptions: [{ type: 'anvil', options: {chainId: 1, hardfork: 'london'}}],
    testSpecificMock,
  },
    async () => {
      await loginToApp();
      await Assertions.checkIfVisible(WalletView.container);
      await TabBarComponent.tapSettings();
      await SettingsView.tapAdvancedTitle();
      await AdvancedSettingsView.tapSmartTransactionSwitch();
      await TabBarComponent.tapWallet();

      await TabBarComponent.tapActions();
      await WalletActionsBottomSheet.tapBridgeButton();
      await device.disableSynchronization();
      await QuoteView.enterBridgeAmount('1');
      await QuoteView.tapBridgeTo();
      await QuoteView.selectNetwork('Base');
      await QuoteView.selectToken('ETH');
      await QuoteView.tapContinue();
   });
  });
});
