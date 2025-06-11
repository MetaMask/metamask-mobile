'use strict';
/**
 * E2E tests for Solana methods using Multichain API
 */
import TestHelpers from '../../../helpers';
import { SmokeNetworkExpansion } from '../../../tags';
import Browser from '../../../pages/Browser/BrowserView';
import TabBarComponent from '../../../pages/wallet/TabBarComponent';
import FixtureBuilder from '../../../fixtures/fixture-builder';
import {
  withFixtures,
  DEFAULT_MULTICHAIN_TEST_DAPP_FIXTURE_OPTIONS,
} from '../../../fixtures/fixture-helper';
import { loginToApp } from '../../../viewHelper';
import Assertions from '../../../utils/Assertions';
import MultichainTestDApp from '../../../pages/Browser/MultichainTestDApp';
import SolanaNewFeatureSheet from '../../../pages/wallet/SolanaNewFeatureSheet';
import AddNewHdAccountComponent from '../../../pages/wallet/MultiSrp/AddAccountToSrp/AddNewHdAccountComponent';
import MultichainUtilities from '../../../utils/MultichainUtilities';

describe(SmokeNetworkExpansion('Solana - wallet_invokeMethod'), () => {
  beforeEach(() => {
    jest.setTimeout(150000); // 2.5 minute timeout for stability
  });

  it('should be able to call signTransaction method', async () => {
    await withFixtures(
      {
        ...DEFAULT_MULTICHAIN_TEST_DAPP_FIXTURE_OPTIONS,
        fixture: new FixtureBuilder()
          .withSolanaFixture()
          .withSolanaFeatureSheetDisplayed()
          .build(),
        restartDevice: true,
      },
      async () => {
        await TestHelpers.reverseServerPort();
        await loginToApp();

        await SolanaNewFeatureSheet.tapCreateAccountButton();
        await AddNewHdAccountComponent.tapConfirm();
        await TestHelpers.delay(4000);

        await TabBarComponent.tapBrowser();
        await Assertions.checkIfVisible(Browser.browserScreenID);

        await MultichainTestDApp.navigateToMultichainTestDApp('?autoMode=true');

        // Solana mainnet chain ID in CAIP format
        const networksToTest = [MultichainUtilities.CHAIN_IDS.SOLANA_MAINNET];

        const createResult = await MultichainTestDApp.createSessionWithNetworks(
          networksToTest,
        );

        if (!createResult.success) {
          throw new Error('Session creation failed for Solana network');
        }

        await TestHelpers.delay(3000);

        const webview = MultichainTestDApp.getWebView();
        const scope = MultichainUtilities.CHAIN_IDS.SOLANA_MAINNET;
        const escapedScopeForButton = scope.replace(/:/g, '-');

        const method = 'signTransaction';
        const directButtonId = `direct-invoke-${escapedScopeForButton}-${method}`;

        const directButton = webview.element(by.web.id(directButtonId));
        await directButton.scrollToView();

        await directButton.tap();

        await TestHelpers.delay(3000);

        //While we don't have actual transaction mocks
        //we just verify that the transaction request is visible
        const transactionRequestText = element(by.text('Transaction Request'));
        await waitFor(transactionRequestText).toBeVisible();

        const solanaMainnetText = element(by.text('Solana Mainnet'));
        await waitFor(solanaMainnetText).toBeVisible();

        const solanaAccount = element(by.text('Solana Account 1'));
        await waitFor(solanaAccount).toBeVisible();
      },
    );
  });
});
