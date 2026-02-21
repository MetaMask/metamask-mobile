/**
 * E2E tests for Solana methods using Multichain API
 */
import { SolScope } from '@metamask/keyring-api';
import TestHelpers from '../../../../e2e/helpers';
import { SmokeMultiChainAPI } from '../../../../e2e/tags';
import Browser from '../../../../e2e/pages/Browser/BrowserView';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper';
import { loginToApp, navigateToBrowserView } from '../../../../e2e/viewHelper';
import Assertions from '../../../framework/Assertions';
import MultichainTestDApp from '../../../../e2e/pages/Browser/MultichainTestDApp';
import AddNewHdAccountComponent from '../../../../e2e/pages/wallet/MultiSrp/AddAccountToSrp/AddNewHdAccountComponent';
import Gestures from '../../../framework/Gestures';
import Matchers from '../../../framework/Matchers';
import WalletView from '../../../../e2e/pages/wallet/WalletView';
import AccountListBottomSheet from '../../../../e2e/pages/wallet/AccountListBottomSheet';
import AddAccountBottomSheet from '../../../../e2e/pages/wallet/AddAccountBottomSheet';
import { DappVariants } from '../../../framework/Constants';

const SOLANA_MAINNET_CHAIN_ID = SolScope.Mainnet;

describe(SmokeMultiChainAPI('Solana - wallet_invokeMethod'), () => {
  it('should be able to call method: signIn', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
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
