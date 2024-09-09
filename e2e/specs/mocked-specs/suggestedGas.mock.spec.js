'use strict';
import { loginToApp } from '../../viewHelper';
import { SmokeAssets } from '../../tags';
import TabBarComponent from '../../pages/TabBarComponent';
import WalletActionsModal from '../../pages/modals/WalletActionsModal';
import SendView from '../../pages/Send/SendView';
import AmountView from '../../pages/Send/AmountView';
import TransactionConfirmView from '../../pages/Send/TransactionConfirmView';
import { startMockServer, stopMockServer } from '../../mocks/mockServer.mock';
import WalletView from '../../pages/wallet/WalletView';
import Assertions from '../../utils/Assertions';
import AccountListView from '../../pages/AccountListView';
import AddAccountModal from '../../pages/modals/AddAccountModal';
import ImportAccountView from '../../pages/ImportAccountView';
import Accounts from '../../../wdio/helpers/Accounts';
import { withFixtures } from '../../fixtures/fixture-helper';
import FixtureBuilder from '../../fixtures/fixture-builder';
import TestHelpers from '../../helpers';

describe(SmokeAssets('Import all tokens detected'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
    await TestHelpers.reverseServerPort();
  });

  const RECIPIENT = '0x1FDb169Ef12954F20A15852980e1F0C122BfC1D6';
  const AMOUNT = '0.0003';
  const validPrivateKey = Accounts.getAccountPrivateKey();

  const mockServer = startMockServer({
    mockUrl: 'https://gas.api.cx.metamask.io/networks/1/suggestedGasFees',
    responseCode: 500,
    port: 8000,
    mockResponse: { error: 'Internal server error' },
  });

  it('should import all tokens detected', async () => {
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
        await TransactionConfirmView.tapEstimatedGasLink();
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
