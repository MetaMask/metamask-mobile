'use strict';
import { ethers } from 'ethers';
import { loginToApp } from '../../viewHelper';
import Onboarding from '../../pages/swaps/OnBoarding';
import QuoteView from '../../pages/swaps/QuoteView';
import SwapView from '../../pages/swaps/SwapView';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import WalletView from '../../pages/wallet/WalletView';
import SettingsView from '../../pages/Settings/SettingsView';
import TokenOverview from '../../pages/wallet/TokenOverview';
import FixtureBuilder from '../../fixtures/fixture-builder';
import {
  loadFixture,
  startFixtureServer,
  stopFixtureServer,
} from '../../fixtures/fixture-helper';
import { CustomNetworks } from '../../resources/networks.e2e';
import TestHelpers from '../../helpers';
import FixtureServer from '../../fixtures/fixture-server';
import { getFixturesServerPort } from '../../fixtures/utils';
import { Regression } from '../../tags';
import AccountListBottomSheet from '../../pages/wallet/AccountListBottomSheet.js';
import ImportAccountView from '../../pages/importAccount/ImportAccountView';
import SuccessImportAccountView from '../../pages/importAccount/SuccessImportAccountView';
import Assertions from '../../utils/Assertions';
import AddAccountBottomSheet from '../../pages/wallet/AddAccountBottomSheet';
import ActivitiesView from '../../pages/Transactions/ActivitiesView';
import { ActivitiesViewSelectorsText } from '../../selectors/Transactions/ActivitiesView.selectors';
import Tenderly from '../../tenderly';
import AdvancedSettingsView from '../../pages/Settings/AdvancedView';

const fixtureServer: FixtureServer = new FixtureServer();

describe(Regression('Swap from Token view'), (): void => {
  const FIRST_ROW: number = 0;
  const swapOnboarded: boolean = true; // TODO: Set it to false once we show the onboarding page again.
  const wallet: ethers.Wallet = ethers.Wallet.createRandom();

  beforeAll(async (): Promise<void> => {
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

  afterAll(async (): Promise<void> => {
    await stopFixtureServer(fixtureServer);
  });

  beforeEach(async (): Promise<void> => {
    jest.setTimeout(150000);
  });

  it('should turn off stx', async (): Promise<void> => {
    await TabBarComponent.tapSettings();
    await SettingsView.tapAdvancedTitle();
    await AdvancedSettingsView.tapSmartTransactionSwitch();
    await TabBarComponent.tapWallet();
  });

  it('should be able to import account', async (): Promise<void> => {
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

  it('should complete a USDC to DAI swap from the token chart', async (): Promise<void> => {
    const sourceTokenSymbol: string = 'ETH';
    const destTokenSymbol: string = 'DAI';

    await TabBarComponent.tapWallet();
    await Assertions.checkIfVisible(WalletView.container);
    await WalletView.tapOnToken('Ethereum');
    await Assertions.checkIfVisible(TokenOverview.container);
    await TokenOverview.scrollOnScreen();
    await TestHelpers.delay(1000);
    await TokenOverview.tapSwapButton();
    if (!swapOnboarded) await Onboarding.tapStartSwapping();
    await Assertions.checkIfVisible(QuoteView.getQuotes);
    await QuoteView.enterSwapAmount('.5');
    await QuoteView.tapOnSelectDestToken();
    await QuoteView.tapSearchToken();
    await QuoteView.typeSearchToken(destTokenSymbol);
    await TestHelpers.delay(3000);
    await QuoteView.selectToken(destTokenSymbol);

    // This call is needed because otherwise the device never becomes idle
    await device.disableSynchronization();

    await QuoteView.tapOnGetQuotes();
    
    // Try to find either the fetching quotes state or the quote summary
    try {
      await Assertions.checkIfVisible(SwapView.fetchingQuotes, 5000);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log('Fetching quotes not found, trying quote summary:', e);
      // If fetching quotes is not found, try to find the quote summary directly
      try {
        await Assertions.checkIfVisible(SwapView.quoteSummary, 5000);
      } catch (e2) {
        // eslint-disable-next-line no-console
        console.log('Quote summary also not found:', e2);
        // If neither is found, wait a bit more and try again
        await Assertions.checkIfVisible(SwapView.quoteSummary, 5000);
      }
    }
    
    await Assertions.checkIfVisible(SwapView.gasFee);
    await SwapView.tapIUnderstandPriceWarning();
    await SwapView.tapSwapButton();
    //Wait for Swap to complete
    try {
      await Assertions.checkIfTextIsDisplayed(
        SwapView.generateSwapCompleteLabel(sourceTokenSymbol, destTokenSymbol),
        30000,
      );
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log(`Swap complete didn't pop up: ${e}`);
    }
    await device.enableSynchronization();
    await TestHelpers.delay(10000);

    // After the swap is complete, the DAI balance shouldn't be 0
    await Assertions.checkIfTextIsNotDisplayed('0 DAI', 60000);

    // Check the swap activity completed
    await TabBarComponent.tapActivity();
    await Assertions.checkIfVisible(ActivitiesView.title);
    await Assertions.checkIfVisible(
      ActivitiesView.swapActivityTitle(sourceTokenSymbol, destTokenSymbol),
    );
    await Assertions.checkIfElementToHaveText(
      ActivitiesView.transactionStatus(FIRST_ROW),
      ActivitiesViewSelectorsText.CONFIRM_TEXT,
      120000,
    );
  });
});
