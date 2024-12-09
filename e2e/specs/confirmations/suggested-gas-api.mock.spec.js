'use strict';
import { loginToApp } from '../../viewHelper.js';
import { Regression } from '../../tags.js';
import TabBarComponent from '../../pages/wallet/TabBarComponent.js';
import WalletActionsBottomSheet from '../../pages/wallet/WalletActionsBottomSheet.js';
import SendView from '../../pages/Send/SendView.js';
import AmountView from '../../pages/Send/AmountView.js';
import TransactionConfirmView from '../../pages/Send/TransactionConfirmView.js';
import WalletView from '../../pages/wallet/WalletView.js';
import Assertions from '../../utils/Assertions.js';
import AccountListBottomSheet from '../../pages/wallet/AccountListBottomSheet.js';
import AddAccountBottomSheet from '../../pages/wallet/AddAccountBottomSheet.js';
import ImportAccountView from '../../pages/importAccount/ImportAccountView.js';
import Accounts from '../../../wdio/helpers/Accounts.js';
import { withFixtures } from '../../fixtures/fixture-helper.js';
import FixtureBuilder from '../../fixtures/fixture-builder.js';
import TestHelpers from '../../helpers.js';
import SuccessImportAccountView from '../../pages/importAccount/SuccessImportAccountView.js';
import { mockEvents } from '../../api-mocking/mock-config/mock-events.js';

describe(
  Regression(
    'Mock suggestedGasApi fallback to legacy gas endpoint  when EIP1559 endpoint is down',
  ),
  () => {
    beforeAll(async () => {
      jest.setTimeout(150000);
      await TestHelpers.reverseServerPort();
    });

    const RECIPIENT = '0x1FDb169Ef12954F20A15852980e1F0C122BfC1D6';
    const AMOUNT = '0.0003';
    const validPrivateKey = Accounts.getAccountPrivateKey();

    it('should fallback to legacy gas endpoint & legacy modal when EIP1559 endpoint is down', async () => {

      const testSpecificMock = {
        GET: [mockEvents.GET.suggestedGasFeesMainNetError],
      };

      await withFixtures(
        {
          fixture: new FixtureBuilder().build(),
          restartDevice: true,
          testSpecificMock,
        },
        async () => {
          await loginToApp();
          await WalletView.tapIdenticon();
          await Assertions.checkIfVisible(AccountListBottomSheet.accountList);
          await AccountListBottomSheet.tapAddAccountButton();
          await AddAccountBottomSheet.tapImportAccount();
          await Assertions.checkIfVisible(ImportAccountView.container);
          await ImportAccountView.enterPrivateKey(validPrivateKey.keys);
          await Assertions.checkIfVisible(SuccessImportAccountView.container);
          await SuccessImportAccountView.tapCloseButton();
          if (device.getPlatform() === 'ios') {
            await AccountListBottomSheet.swipeToDismissAccountsModal();
            await Assertions.checkIfNotVisible(AccountListBottomSheet.title);
          } else {
            await WalletView.tapIdenticon();
          }
          await TabBarComponent.tapActions();
          await WalletActionsBottomSheet.tapSendButton();
          await SendView.inputAddress(RECIPIENT);
          await SendView.tapNextButton();
          await AmountView.typeInTransactionAmount(AMOUNT);
          await AmountView.tapNextButton();
          await TransactionConfirmView.tapEstimatedGasLink(1);
          await Assertions.checkIfVisible(
            TransactionConfirmView.editPriorityLegacyModal,
          );
          await Assertions.checkIfVisible(
            TransactionConfirmView.editPriorityFeeSheetContainer,
            30000,
          );
        },
      );
    });
  },
);
