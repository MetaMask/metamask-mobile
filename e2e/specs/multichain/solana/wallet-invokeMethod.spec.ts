'use strict';
/**
 * E2E tests for Solana methods using Multichain API
 */
import { SolScope } from '@metamask/keyring-api';
import TestHelpers from '../../../helpers';
import { SmokeMultiChainAPI } from '../../../tags';
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
import Gestures from '../../../utils/Gestures';
import Matchers from '../../../utils/Matchers';
import WalletView from '../../../pages/wallet/WalletView';
import AccountListBottomSheet from '../../../pages/wallet/AccountListBottomSheet';
import AddAccountBottomSheet from '../../../pages/wallet/AddAccountBottomSheet';

const SOLANA_MAINNET_CHAIN_ID = SolScope.Mainnet;

describe(SmokeMultiChainAPI('Solana - wallet_invokeMethod'), () => {
  it('should be able to call method: signIn', async () => {
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

        await SolanaNewFeatureSheet.tapNotNowButton();

        await WalletView.tapIdenticon();
        await Assertions.checkIfVisible(AccountListBottomSheet.accountList);
        await AccountListBottomSheet.tapAddAccountButton();
        await TestHelpers.delay(4000);
        await AddAccountBottomSheet.tapAddSolanaAccount();
        await AddNewHdAccountComponent.tapConfirm();
        await TestHelpers.delay(4000);

        await TabBarComponent.tapBrowser();
        await Assertions.checkIfVisible(Browser.browserScreenID);

        await MultichainTestDApp.navigateToMultichainTestDApp();

        await MultichainTestDApp.createSessionWithNetworks([
          SOLANA_MAINNET_CHAIN_ID,
        ]);

        const method = 'signIn';

        await MultichainTestDApp.invokeMethodOnChain(
          SOLANA_MAINNET_CHAIN_ID,
          method,
        );

        const buttonElement = await Matchers.getElementByText('Confirm');
        await Gestures.waitAndTap(buttonElement);

        const resultText = await MultichainTestDApp.getInvokeMethodResult(
          SOLANA_MAINNET_CHAIN_ID,
          method,
        );

        if (!resultText) {
          throw new Error(`No result found for ${method} on chain: Solana`);
        }

        const expectedProperties = [
          'account',
          'signature',
          'signatureType',
          'signedMessage',
        ];

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
