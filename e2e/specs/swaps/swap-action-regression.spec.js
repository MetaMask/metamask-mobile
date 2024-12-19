'use strict';
import { ethers } from 'ethers';
import { loginToApp } from '../../viewHelper';
import Onboarding from '../../pages/swaps/OnBoarding';
import QuoteView from '../../pages/swaps/QuoteView';
import SwapView from '../../pages/swaps/SwapView';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import ActivitiesView from '../../pages/Transactions/ActivitiesView';
import WalletActionsBottomSheet from '../../pages/wallet/WalletActionsBottomSheet';
import WalletView from '../../pages/wallet/WalletView';
import FixtureBuilder from '../../fixtures/fixture-builder';
import {
  loadFixture,
  startFixtureServer,
  stopFixtureServer,
} from '../../fixtures/fixture-helper';
import { CustomNetworks } from '../../resources/networks.e2e';
import NetworkListModal from '../../pages/Network/NetworkListModal';
import NetworkEducationModal from '../../pages/Network/NetworkEducationModal';
import TestHelpers from '../../helpers';
import FixtureServer from '../../fixtures/fixture-server';
import { getFixturesServerPort } from '../../fixtures/utils';
import { Regression } from '../../tags';
import AccountListBottomSheet from '../../pages/wallet/AccountListBottomSheet.js';
import ImportAccountView from '../../pages/importAccount/ImportAccountView';
import CommonView from '../../pages/CommonView';
import SuccessImportAccountView from '../../pages/importAccount/SuccessImportAccountView';
import Assertions from '../../utils/Assertions';
import AddAccountBottomSheet from '../../pages/wallet/AddAccountBottomSheet';
import { ActivitiesViewSelectorsText } from '../../selectors/Transactions/ActivitiesView.selectors';
import Tenderly from '../../tenderly';

const fixtureServer = new FixtureServer();
const firstElement = 0;

describe(Regression('Multiple Swaps from Actions'), () => {
  let swapOnboarded = true; // TODO: Set it to false once we show the onboarding page again.
  let currentNetwork = CustomNetworks.Tenderly.Mainnet.providerConfig.nickname;
  const wallet = ethers.Wallet.createRandom();

  beforeAll(async () => {
    await Tenderly.addFunds( CustomNetworks.Tenderly.Mainnet.providerConfig.rpcUrl, wallet.address);

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

  it('should be able to import account', async () => {
    await WalletView.tapIdenticon();
    await Assertions.checkIfVisible(AccountListBottomSheet.accountList);
    await AccountListBottomSheet.tapAddAccountButton();
    await AddAccountBottomSheet.tapImportAccount();
    await Assertions.checkIfVisible(ImportAccountView.container);
    // Tap on import button to make sure alert pops up
    await ImportAccountView.tapImportButton();
    await CommonView.tapOKAlertButton();
    await ImportAccountView.enterPrivateKey(wallet.privateKey);
    await Assertions.checkIfVisible(SuccessImportAccountView.container);
    await SuccessImportAccountView.tapCloseButton();
    await AccountListBottomSheet.swipeToDismissAccountsModal();
    await Assertions.checkIfVisible(WalletView.container);
    await TestHelpers.delay(2000);
  });

  // Remove ERC20->ERC20 temporarily due to bug
  // ${'unapproved'}$ |${'50'}   | ${'DAI'}          | ${'USDC'}       | ${CustomNetworks.Tenderly.Mainnet}
  it.each`
    type             | quantity | sourceTokenSymbol | destTokenSymbol | network
    ${'native'}$     |${'.03'}   | ${'ETH'}          | ${'WETH'}       | ${CustomNetworks.Tenderly.Mainnet}
    ${'native'}$     |${'.03'}   | ${'ETH'}          | ${'DAI'}        | ${CustomNetworks.Tenderly.Mainnet}
    ${'wrapped'}$    |${'.01'}   | ${'WETH'}         | ${'ETH'}        | ${CustomNetworks.Tenderly.Mainnet}
    ${'unapproved'}$ |${'3'}   | ${'DAI'}          | ${'USDC'}       | ${CustomNetworks.Tenderly.Mainnet}
  `(
    "should swap $type token '$sourceTokenSymbol' to '$destTokenSymbol' on '$network.providerConfig.nickname'",
    async ({ type, quantity, sourceTokenSymbol, destTokenSymbol, network }) => {

      await TabBarComponent.tapWallet();

      if (network.providerConfig.nickname !== currentNetwork)
      {
        await WalletView.tapNetworksButtonOnNavBar();
        await Assertions.checkIfToggleIsOn(NetworkListModal.testNetToggle);
        await NetworkListModal.changeNetworkTo(network.providerConfig.nickname, false);
        await NetworkEducationModal.tapGotItButton();
        await TestHelpers.delay(3000);
        currentNetwork = network.providerConfig.nickname;
      }

      await Assertions.checkIfVisible(WalletView.container);
      await TabBarComponent.tapActions();
      await WalletActionsBottomSheet.tapSwapButton();

      if (!swapOnboarded) {
        await Onboarding.tapStartSwapping();
        swapOnboarded = true;
      }
      await Assertions.checkIfVisible(QuoteView.getQuotes);

      //Select source token, if native token can skip because already selected
      if (type !== 'native') {
        await QuoteView.tapOnSelectSourceToken();
        await QuoteView.tapSearchToken();
        await QuoteView.typeSearchToken(sourceTokenSymbol);

        await QuoteView.selectToken(sourceTokenSymbol);
      }
      await QuoteView.enterSwapAmount(quantity);

      //Select destination token
      await QuoteView.tapOnSelectDestToken();
      if (destTokenSymbol !== 'ETH')
      {
          await QuoteView.tapSearchToken();
          await QuoteView.typeSearchToken(destTokenSymbol);
          await TestHelpers.delay(2000);
          await QuoteView.selectToken(destTokenSymbol);
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
      await SwapView.tapSwapButton();
      //Wait for Swap to complete
      await SwapView.swapCompleteLabel(sourceTokenSymbol, destTokenSymbol);
      await device.enableSynchronization();
      await TestHelpers.delay(10000);

      // Check the swap activity completed
      await TabBarComponent.tapActivity();
      await Assertions.checkIfVisible(ActivitiesView.title);
      await Assertions.checkIfVisible(
        ActivitiesView.swapActivityTitle(sourceTokenSymbol, destTokenSymbol),
      );
      await Assertions.checkIfElementToHaveText(ActivitiesView.firstTransactionStatus, ActivitiesViewSelectorsText.CONFIRM_TEXT, 60000);

      // Check the token approval completed
      if (type === 'unapproved') {
        await Assertions.checkIfVisible(
          ActivitiesView.tokenApprovalActivity(sourceTokenSymbol),
        );
        await Assertions.checkIfElementToHaveText(ActivitiesView.secondTransactionStatus, ActivitiesViewSelectorsText.CONFIRM_TEXT, 60000);
      }

      await TabBarComponent.tapWallet();
      await WalletView.tapIdenticon();
      await Assertions.checkIfVisible(AccountListBottomSheet.accountList);
      // This needs to be updated with the token balance
      await AccountListBottomSheet.tapToSelectActiveAccountAtIndex(1);

    },
  );
});
