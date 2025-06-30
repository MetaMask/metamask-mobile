'use strict';
/**
 * E2E tests for Solana methods using Multichain API
 */
import { SolScope } from '@metamask/keyring-api';
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

describe(SmokeNetworkExpansion('Solana - wallet_invokeMethod'), () => {
  it('should be able to call signIn method', async () => {
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

        await TabBarComponent.tapBrowser();
        await Assertions.checkIfVisible(Browser.browserScreenID);

        await MultichainTestDApp.navigateToMultichainTestDApp();

        const networksToTest = [SolScope.Mainnet];

        await MultichainTestDApp.createSessionWithNetworks(networksToTest);

        const method = 'signIn';

        await MultichainTestDApp.invokeMethodOnChain('solana', method);

        const confirmButton = element(by.text('Confirm'));
        await waitFor(confirmButton).toBeVisible().withTimeout(5000);
        await confirmButton.tap();

        const resultText = await MultichainTestDApp.getInvokeMethodResult(
          'solana',
          method,
        );

        const expectedProperties = [
          'account',
          'signature',
          'signatureType',
          'signedMessage',
        ];

        if (!resultText) {
          throw new Error(`No result found for ${method} on chain: Solana`);
        }

        for (const property of expectedProperties) {
          if (!resultText.includes(property)) {
            throw new Error(
              `Expected element ${property} not found in result: ${resultText}`,
            );
          }
        }
      },
    );
  });
});
