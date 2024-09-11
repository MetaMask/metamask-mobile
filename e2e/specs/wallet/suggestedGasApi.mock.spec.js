'use strict';
import { loginToApp } from '../../viewHelper.js';
import {SmokeAssets, SmokeCore} from '../../tags.js';
import TabBarComponent from '../../pages/TabBarComponent.js';
import WalletActionsModal from '../../pages/modals/WalletActionsModal.js';
import SendView from '../../pages/Send/SendView.js';
import AmountView from '../../pages/Send/AmountView.js';
import TransactionConfirmView from '../../pages/Send/TransactionConfirmView.js';
import { startMockServer, stopMockServer } from '../../mockserver/mockserver.js';
import WalletView from '../../pages/wallet/WalletView.js';
import Assertions from '../../utils/Assertions.js';
import AccountListView from '../../pages/AccountListView.js';
import AddAccountModal from '../../pages/modals/AddAccountModal.js';
import ImportAccountView from '../../pages/ImportAccountView.js';
import Accounts from '../../../wdio/helpers/Accounts.js';
import { withFixtures } from '../../fixtures/fixture-helper.js';
import FixtureBuilder from '../../fixtures/fixture-builder.js';
import TestHelpers from '../../helpers.js';

describe(SmokeCore('Mock suggestedGasApi fallback to legacy when EIP1559 endpoint is down'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
    await TestHelpers.reverseServerPort();
  });

  const RECIPIENT = '0x1FDb169Ef12954F20A15852980e1F0C122BfC1D6';
  const AMOUNT = '0.0003';
  const validPrivateKey = Accounts.getAccountPrivateKey();

  const mockServer = startMockServer({ // Configure mock server
    mockUrl: 'https://gas.api.cx.metamask.io/networks/1/suggestedGasFees',
    responseCode: 500,
    port: 8000,
    mockResponse: { error: 'Internal server error' },
  });

  afterAll(async () => {
    try {
      await stopMockServer(mockServer);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.log('Mock server already stopped');
    }
  });

  it('should fallback to legacy when EIP1559 endpoint is down', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await WalletView.tapIdenticon();
        await Assertions.checkIfVisible(AccountListView.accountList);
        await AccountListView.tapAddAccountButton();
        await AddAccountModal.tapImportAccount();
        await ImportAccountView.isVisible();
        await ImportAccountView.enterPrivateKey(validPrivateKey.keys);
        await ImportAccountView.isImportSuccessSreenVisible();
        await ImportAccountView.tapCloseButtonOnImportSuccess();
        await AccountListView.swipeToDismissAccountsModal();
        await TabBarComponent.tapActions();
        await WalletActionsModal.tapSendButton();
        await SendView.inputAddress(RECIPIENT);
        await SendView.tapNextButton();
        await AmountView.typeInTransactionAmount(AMOUNT);
        await AmountView.tapNextButton();
        await TransactionConfirmView.tapEstimatedGasLink(1);
        await Assertions.checkIfVisible(
          TransactionConfirmView.editPriorityModal,
        );
        await stopMockServer(mockServer); //stop mock server to reinstate suggested gas api service
        await TestHelpers.delay(20000);
        await Assertions.checkIfVisible(
          TransactionConfirmView.editPriorityFeeSheetContainer,
        );
      },
    );
  });
});