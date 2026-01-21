/**
 * E2E tests for Solana methods using Multichain API
 */
import { SolScope } from '@metamask/keyring-api';
import TestHelpers from '../../helpers';
import { SmokeMultiChainAPI } from '../../tags';
import Browser from '../../page-objects/Browser/BrowserView';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import {
  loginToApp,
  navigateToBrowserView,
} from '../../page-objects/viewHelper.ts';
import Assertions from '../../framework/Assertions';
import MultichainTestDApp from '../../page-objects/Browser/MultichainTestDApp';
import AddNewHdAccountComponent from '../../page-objects/wallet/MultiSrp/AddAccountToSrp/AddNewHdAccountComponent';
import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';
import WalletView from '../../page-objects/wallet/WalletView';
import AccountListBottomSheet from '../../page-objects/wallet/AccountListBottomSheet';
import AddAccountBottomSheet from '../../page-objects/wallet/AddAccountBottomSheet';
import { DappVariants } from '../../framework/Constants';

const SOLANA_MAINNET_CHAIN_ID = SolScope.Mainnet;

describe.skip(SmokeMultiChainAPI('Solana - wallet_invokeMethod'), () => {
  it('should be able to call method: signIn', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withSolanaFixture().build(),
        dapps: [
          {
            dappVariant: DappVariants.MULTICHAIN_TEST_DAPP,
          },
        ],
        restartDevice: true,
      },
      async () => {
        await TestHelpers.reverseServerPort();
        await loginToApp();

        await WalletView.tapIdenticon();
        await Assertions.expectElementToBeVisible(
          AccountListBottomSheet.accountList,
        );
        await AccountListBottomSheet.tapAddAccountButton();
        await AddAccountBottomSheet.tapAddSolanaAccount();
        await AddNewHdAccountComponent.tapConfirm();

        await navigateToBrowserView();
        await Assertions.expectElementToBeVisible(Browser.browserScreenID);

        await MultichainTestDApp.navigateToMultichainTestDApp();

        await MultichainTestDApp.createSessionWithNetworks([
          SOLANA_MAINNET_CHAIN_ID,
        ]);

        const method = 'signIn';

        await MultichainTestDApp.invokeMethodOnChain(
          SOLANA_MAINNET_CHAIN_ID,
          method,
        );

        // This needs to be turned into a PageObject for consistency
        const buttonElement = await Matchers.getElementByText('Confirm');
        await Gestures.waitAndTap(buttonElement as unknown as DetoxElement);

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
