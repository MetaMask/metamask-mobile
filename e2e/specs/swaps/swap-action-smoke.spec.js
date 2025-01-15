'use strict';
import { ethers } from 'ethers';
import { loginToApp } from '../../viewHelper';
import Onboarding from '../../pages/swaps/OnBoarding';
import QuoteView from '../../pages/swaps/QuoteView';
import SwapView from '../../pages/swaps/SwapView';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import ActivitiesView from '../../pages/Transactions/ActivitiesView';
import DetailsBottomSheet from '../../pages/Transactions/TransactionDetailsModal';
import WalletActionsBottomSheet from '../../pages/wallet/WalletActionsBottomSheet';
import FixtureBuilder from '../../fixtures/fixture-builder';
import Tenderly from '../../tenderly';
import {
  loadFixture,
  startFixtureServer,
  stopFixtureServer,
} from '../../fixtures/fixture-helper';
import { CustomNetworks } from '../../resources/networks.e2e';
import TestHelpers from '../../helpers';
import FixtureServer from '../../fixtures/fixture-server';
import { getFixturesServerPort } from '../../fixtures/utils';
import { SmokeSwaps } from '../../tags';
import AccountListView from '../../pages/AccountListView';
import ImportAccountView from '../../pages/ImportAccountView';
import Assertions from '../../utils/Assertions';
import AddAccountModal from '../../pages/modals/AddAccountModal';

const fixtureServer = new FixtureServer();

describe(SmokeSwaps('Swap from Actions'), () => {
  let swapOnboarded = true; // TODO: Set it to false once we show the onboarding page again.

  beforeAll(async () => {
    await TestHelpers.reverseServerPort();
    const fixture = new FixtureBuilder()
      .withNetworkController(CustomNetworks.Tenderly)
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
    jest.setTimeout(150000);
  });

  it('should be able to import account', async () => {
    const wallet = ethers.Wallet.createRandom();
    await Tenderly.addFunds(
      CustomNetworks.Tenderly.providerConfig.rpcUrl,
      wallet.address,
      '0xDE0B6B3A7640000', // 1 ETH
    );

    await WalletView.tapIdenticon();
    await Assertions.checkIfVisible(AccountListView.accountList);
    await AccountListView.tapAddAccountButton();
    await AddAccountModal.tapImportAccount();
    await ImportAccountView.isVisible();
    // Tap on import button to make sure alert pops up
    await ImportAccountView.tapImportButton();
    await ImportAccountView.tapOKAlertButton();
    await ImportAccountView.enterPrivateKey(wallet.privateKey);
    await ImportAccountView.isImportSuccessSreenVisible();
    await ImportAccountView.tapCloseButtonOnImportSuccess();
    await AccountListView.swipeToDismissAccountsModal();
    await Assertions.checkIfVisible(WalletView.container);
    await Assertions.checkIfElementNotToHaveText(
      WalletView.accountName,
      'Account 1',
    );
    await Assertions.checkIfElementNotToHaveText(WalletView.totalBalance, '$0');
  });

  it.each`
    quantity | sourceTokenSymbol | destTokenSymbol
    ${'.05'} | ${'ETH'}          | ${'DAI'}
    ${'100'} | ${'DAI'}          | ${'ETH'}
  `(
    "should Swap $quantity '$sourceTokenSymbol' to '$destTokenSymbol'",
    async ({ quantity, sourceTokenSymbol, destTokenSymbol }) => {
      await TabBarComponent.tapWallet();
      await TabBarComponent.tapActions();
      await WalletActionsBottomSheet.tapSwapButton();

      if (!swapOnboarded) {
        await Onboarding.tapStartSwapping();
        swapOnboarded = true;
      }
      await Assertions.checkIfVisible(QuoteView.getQuotes);

      //Select source token, if ETH then can skip because already selected
      if (sourceTokenSymbol !== 'ETH') {
        await QuoteView.tapOnSelectSourceToken();
        await QuoteView.tapSearchToken();
        await QuoteView.typeSearchToken(sourceTokenSymbol);
        await TestHelpers.delay(1000);
        await QuoteView.selectToken(sourceTokenSymbol);
      }
      await QuoteView.enterSwapAmount(quantity);

      //Select destination token
      await QuoteView.tapOnSelectDestToken();
      await QuoteView.tapSearchToken();
      await QuoteView.typeSearchToken(destTokenSymbol);
      await TestHelpers.delay(1000);
      await QuoteView.selectToken(destTokenSymbol);

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
      await SwapView.swipeToSwap();
      try {
        await Assertions.checkIfVisible(
          SwapView.swapCompleteLabel(sourceTokenSymbol, destTokenSymbol),
          30000,
        );
      } catch (e) {
        // eslint-disable-next-line no-console
        console.log(`Toast message is slow to appear or did not appear: ${e}`);
      }
      await device.enableSynchronization();
      await TestHelpers.delay(5000);

      await WalletView.tapNetworksButtonOnNavBar();
      await NetworkListModal.changeNetworkTo(
        CustomNetworks.Tenderly.providerConfig.nickname,
        true,
      );

      await TabBarComponent.tapActivity();
      await Assertions.checkIfVisible(ActivitiesView.title);
      await Assertions.checkIfVisible(
        ActivitiesView.swapActivity(sourceTokenSymbol, destTokenSymbol),
      );
      await ActivitiesView.tapOnSwapActivity(
        sourceTokenSymbol,
        destTokenSymbol,
      );

      try {
        await Assertions.checkIfVisible(DetailsBottomSheet.title);
      } catch (e) {
        await ActivitiesView.tapOnSwapActivity(
          sourceTokenSymbol,
          destTokenSymbol,
        );
        await Assertions.checkIfVisible(DetailsBottomSheet.title);
      }
      await Assertions.checkIfElementToHaveText(
        DetailsBottomSheet.title,
        DetailsBottomSheet.generateExpectedTitle(sourceTokenSymbol, destTokenSymbol),
      );
      await Assertions.checkIfVisible(DetailsBottomSheet.statusConfirmed);
      await DetailsBottomSheet.tapOnCloseIcon();
      await Assertions.checkIfNotVisible(DetailsBottomSheet.title);
    },
  );
});
