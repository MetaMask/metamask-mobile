'use strict';
import { ethers } from 'ethers';
import { loginToApp } from '../../viewHelper.js';
import QuoteView from '../../pages/swaps/QuoteView.js';
import SwapView from '../../pages/swaps/SwapView.js';
import TabBarComponent from '../../pages/wallet/TabBarComponent.js';
import AccountListBottomSheet from '../../pages/wallet/AccountListBottomSheet.js';
import WalletView from '../../pages/wallet/WalletView.js';
import WalletActionsBottomSheet from '../../pages/wallet/WalletActionsBottomSheet.js';
import SettingsView from '../../pages/Settings/SettingsView';
import FixtureBuilder from '../../fixtures/fixture-builder.js';
import Tenderly from '../../tenderly.js';
import {
  loadFixture,
  startFixtureServer,
  stopFixtureServer,
} from '../../fixtures/fixture-helper.js';
import { CustomNetworks } from '../../resources/networks.e2e.js';
import NetworkListModal from '../../pages/Network/NetworkListModal.js';
import NetworkEducationModal from '../../pages/Network/NetworkEducationModal.js';
import TestHelpers from '../../helpers.js';
import FixtureServer from '../../fixtures/fixture-server.js';
import { getFixturesServerPort } from '../../fixtures/utils.js';
import { SmokeSwaps } from '../../tags.js';
import ImportAccountView from '../../pages/importAccount/ImportAccountView.js';
import SuccessImportAccountView from '../../pages/importAccount/SuccessImportAccountView.js';
import Assertions from '../../utils/Assertions.js';
import AddAccountBottomSheet from '../../pages/wallet/AddAccountBottomSheet.js';
import ActivitiesView from '../../pages/Transactions/ActivitiesView.js';
import { ActivitiesViewSelectorsText } from '../../selectors/Transactions/ActivitiesView.selectors';
import AdvancedSettingsView from '../../pages/Settings/AdvancedView';

const fixtureServer = new FixtureServer();
const firstElement = 0;

describe(SmokeSwaps('Swap from Actions'), () => {
  const FIRST_ROW = 0;
  const SECOND_ROW = 1;
  let currentNetwork = CustomNetworks.Tenderly.Mainnet.providerConfig.nickname;
  const wallet = ethers.Wallet.createRandom();

  beforeAll(async () => {
    await Tenderly.addFunds(
      CustomNetworks.Tenderly.Mainnet.providerConfig.rpcUrl,
      wallet.address,
    );

    await TestHelpers.reverseServerPort();
    const fixture = new FixtureBuilder()
      .withNetworkController(CustomNetworks.Tenderly.Mainnet)
      .build();
    await startFixtureServer(fixtureServer);
    await loadFixture(fixtureServer, { fixture });
    await TestHelpers.launchApp({
      permissions: { notifications: 'YES' },
      launchArgs: { fixtureServerPort: `${getFixturesServerPort()}` },
    });
    await loginToApp();
  });

  afterAll(async () => {
    await stopFixtureServer(fixtureServer);
  });

  beforeEach(async () => {
    jest.setTimeout(120000);
  });

  it('should turn off stx', async () => {
    await TabBarComponent.tapSettings();
    await SettingsView.tapAdvancedTitle();
    await AdvancedSettingsView.tapSmartTransactionSwitch();
    await TabBarComponent.tapWallet();
  });

  it('should be able to import account', async () => {
    await WalletView.tapIdenticon();
    await Assertions.checkIfVisible(AccountListBottomSheet.accountList);
    await AccountListBottomSheet.tapAddAccountButton();
    await AddAccountBottomSheet.tapImportAccount();
    await Assertions.checkIfVisible(ImportAccountView.container);
    await ImportAccountView.enterPrivateKey(wallet.privateKey);
    await Assertions.checkIfVisible(SuccessImportAccountView.container);
    await SuccessImportAccountView.tapCloseButton();
    await AccountListBottomSheet.swipeToDismissAccountsModal();
    await Assertions.checkIfVisible(WalletView.container);
  });

  it.each`
    type        | quantity | sourceTokenSymbol | destTokenSymbol | network
    ${'wrap'}   | ${'.03'} | ${'ETH'}          | ${'WETH'}       | ${CustomNetworks.Tenderly.Mainnet}
    ${'unwrap'} | ${'.01'} | ${'WETH'}         | ${'ETH'}        | ${CustomNetworks.Tenderly.Mainnet}
  `(
    "should swap $type token '$sourceTokenSymbol' to '$destTokenSymbol' on '$network.providerConfig.nickname'",
    async ({ type, quantity, sourceTokenSymbol, destTokenSymbol, network }) => {
      await TabBarComponent.tapWallet();

      if (network.providerConfig.nickname !== currentNetwork) {
        await WalletView.tapNetworksButtonOnNavBar();
        await Assertions.checkIfToggleIsOn(NetworkListModal.testNetToggle);
        await NetworkListModal.changeNetworkTo(
          network.providerConfig.nickname,
          false,
        );
        await NetworkEducationModal.tapGotItButton();
        await TestHelpers.delay(3000);
        currentNetwork = network.providerConfig.nickname;
      }

      await Assertions.checkIfVisible(WalletView.container);
      await TabBarComponent.tapActions();
      await WalletActionsBottomSheet.tapSwapButton();
      await Assertions.checkIfVisible(QuoteView.getQuotes);

      //Select source token, if native tiken can skip because already selected
      if (type !== 'native' && type !== 'wrap') {
        await QuoteView.tapOnSelectSourceToken();
        await QuoteView.tapSearchToken();
        await QuoteView.typeSearchToken(sourceTokenSymbol);
        await TestHelpers.delay(2000);
        await QuoteView.selectToken(sourceTokenSymbol, 2);
      }
      await QuoteView.enterSwapAmount(quantity);

      //Select destination token
      await QuoteView.tapOnSelectDestToken();
      if (destTokenSymbol !== 'ETH') {
        await QuoteView.tapSearchToken();
        await QuoteView.typeSearchToken(destTokenSymbol);
        await TestHelpers.delay(2000);
        await QuoteView.selectToken(destTokenSymbol, 2);
      } else await QuoteView.selectToken(destTokenSymbol, firstElement);

      //Make sure slippage is zero for wrapped tokens
      if (sourceTokenSymbol === 'WETH' || destTokenSymbol === 'WETH') {
        await Assertions.checkIfElementToHaveText(
          QuoteView.maxSlippage,
          'Max slippage 0%',
        );
      }
      await QuoteView.tapOnGetQuotes();
      await Assertions.checkIfVisible(SwapView.fetchingQuotes);
      await Assertions.checkIfVisible(SwapView.quoteSummary);
      await Assertions.checkIfVisible(SwapView.gasFee);
      await SwapView.tapIUnderstandPriceWarning();
      await Assertions.checkIfVisible(SwapView.swapButton);
      await TestHelpers.delay(2000);
      await SwapView.tapSwapButton();
      //Wait for Swap to complete
      try {
        await Assertions.checkIfTextIsDisplayed(
          SwapView.generateSwapCompleteLabel(
            sourceTokenSymbol,
            destTokenSymbol,
          ),
          30000,
        );
      } catch (e) {
        // eslint-disable-next-line no-console
        console.log(`Swap complete didn't pop up: ${e}`);
      }
      await device.enableSynchronization();
      await TestHelpers.delay(10000);

      // Check the swap activity completed
      await TabBarComponent.tapActivity();
      await Assertions.checkIfVisible(ActivitiesView.title);
      await Assertions.checkIfVisible(
        ActivitiesView.swapActivityTitle(sourceTokenSymbol, destTokenSymbol),
      );
      await Assertions.checkIfElementToHaveText(ActivitiesView.transactionStatus(FIRST_ROW), ActivitiesViewSelectorsText.CONFIRM_TEXT, 120000);

      // Check the token approval completed
      if (type === 'unapproved') {
        await Assertions.checkIfVisible(
          ActivitiesView.tokenApprovalActivity(sourceTokenSymbol),
        );
        await Assertions.checkIfElementToHaveText(ActivitiesView.transactionStatus(SECOND_ROW), ActivitiesViewSelectorsText.CONFIRM_TEXT, 120000);
      }
    },
  );
});
