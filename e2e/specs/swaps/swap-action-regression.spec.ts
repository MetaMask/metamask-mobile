'use strict';
import { ethers } from 'ethers';
import { loginToApp } from '../../viewHelper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import ActivitiesView from '../../pages/Transactions/ActivitiesView';
import WalletActionsBottomSheet from '../../pages/wallet/WalletActionsBottomSheet';
import WalletView from '../../pages/wallet/WalletView';
import SettingsView from '../../pages/Settings/SettingsView';
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
import { ActivitiesViewSelectorsText } from '../../selectors/Transactions/ActivitiesView.selectors';
import AdvancedSettingsView from '../../pages/Settings/AdvancedView';
import { submitSwapUnifiedUI } from './helpers/swapUnifiedUI';
import Tenderly from '../../tenderly';

const fixtureServer = new FixtureServer();

describe(Regression('Multiple Swaps from Actions'), () => {
  const FIRST_ROW: number = 0;
  const SECOND_ROW: number = 1;
  const wallet: ethers.Wallet = ethers.Wallet.createRandom();

  beforeAll(async () => {
    jest.setTimeout(2500000);

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
    type            | quantity | sourceTokenSymbol | destTokenSymbol | network
    ${'native'}     | ${'.03'} | ${'ETH'}          | ${'DAI'}        | ${CustomNetworks.Tenderly.Mainnet}
    ${'unapproved'} | ${'3'}   | ${'DAI'}          | ${'USDC'}       | ${CustomNetworks.Tenderly.Mainnet}
    ${'erc20'}      | ${'10'}  | ${'DAI'}          | ${'ETH'}        | ${CustomNetworks.Tenderly.Mainnet}
  `(
    "should swap $type token '$sourceTokenSymbol' to '$destTokenSymbol' on '$network.providerConfig.nickname'",
    async ({ type, quantity, sourceTokenSymbol, destTokenSymbol, network }) => {
      await TabBarComponent.tapActions();
      await Assertions.checkIfVisible(WalletActionsBottomSheet.swapButton);
      await WalletActionsBottomSheet.tapSwapButton();

      // Submit the Swap
      await submitSwapUnifiedUI(
        quantity,
        sourceTokenSymbol,
        destTokenSymbol,
        network.providerConfig.chainId,
      );

      // Check the swap activity completed
      await Assertions.checkIfVisible(ActivitiesView.title);
      await Assertions.checkIfVisible(
        ActivitiesView.swapActivityTitle(sourceTokenSymbol, destTokenSymbol),
      );
      await Assertions.checkIfElementToHaveText(
        ActivitiesView.transactionStatus(FIRST_ROW),
        ActivitiesViewSelectorsText.CONFIRM_TEXT,
        60000,
      );

      // Check the token approval completed
      if (type === 'unapproved') {
        await Assertions.checkIfVisible(
          ActivitiesView.tokenApprovalActivity(sourceTokenSymbol),
        );
        await Assertions.checkIfElementToHaveText(
          ActivitiesView.transactionStatus(SECOND_ROW),
          ActivitiesViewSelectorsText.CONFIRM_TEXT,
          60000,
        );
      }
    },
  );
});

