'use strict';
import { SmokeNetworkExpansion } from '../../tags';
import { importWalletWithRecoveryPhrase, loginToApp } from '../../viewHelper';
import Assertions from '../../utils/Assertions';
import TestHelpers from '../../helpers';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import WalletActionsBottomSheet from '../../pages/wallet/WalletActionsBottomSheet';
import ActivitiesView from '../../pages/Transactions/ActivitiesView';
import SnapSendActionSheet from '../../pages/wallet/SendActionBottomSheet';
import { SendActionViewSelectorsIDs } from '../../selectors/SendFlow/SendActionView.selectors';
import NetworkEducationModal from '../../pages/Network/NetworkEducationModal';
import WalletView from '../../pages/wallet/WalletView';
import AccountListBottomSheet from '../../pages/wallet/AccountListBottomSheet';
import AddAccountBottomSheet from '../../pages/wallet/AddAccountBottomSheet';
import AddNewHdAccountComponent from '../../pages/wallet/MultiSrp/AddAccountToSrp/AddNewHdAccountComponent';

// Test constants
const INVALID_ADDRESS = 'invalid address';
const INVALID_ADDRESS_ERROR = 'Invalid Solana address or domain name';
const RECIPIENT_ADDRESS = 'EjiyBUWeEXPBJT5cB2jzbm6pmbBxWuyVyVBGasSGgtXt';
const TRANSFER_AMOUNT = '0.002';
const EXPECTED_CONFIRMATION = '0.002 SOL was successfully sent';
const RECIPIENT_SHORT_ADDRESS = 'EjiyBUW...GgtXt';
const RECENT_TRANSACTION_INDEX = 0;

describe(
  SmokeNetworkExpansion('Solana Token Transfer Functionality'),
  () => {
    beforeAll(async () => {
      jest.setTimeout(150000);
      await TestHelpers.launchApp();
    });

    it('should import wallet with a Solana account', async () => {
      await importWalletWithRecoveryPhrase({
        seedPhrase: process.env.MM_SOLANA_E2E_TEST_SRP,
        solanaSheetAction: 'dismiss',
      });
      
      await WalletView.tapCurrentMainWalletAccountActions();
      await AccountListBottomSheet.tapAddAccountButton();
      await AddAccountBottomSheet.tapAddSolanaAccount();
      await AddNewHdAccountComponent.tapConfirm();

      await TestHelpers.delay(2000);

      await Assertions.checkIfVisible(NetworkEducationModal.container);
      await NetworkEducationModal.tapGotItButton();
    });

    it('should validate recipient address format correctly', async () => {
      await TabBarComponent.tapActions();
      await WalletActionsBottomSheet.tapSendButton();
      await SnapSendActionSheet.sendActionInputAddress(INVALID_ADDRESS);
      await Assertions.checkIfElementToHaveText(
        SnapSendActionSheet.invalidAddressError,
        INVALID_ADDRESS_ERROR,
      );
      // Snap UI components prove tricky for testID's
      await SnapSendActionSheet.tapCancelButton();
    });

    it('should successfully transfer SOL to a valid recipient address', async () => {
      await TabBarComponent.tapActions();
      await WalletActionsBottomSheet.tapSendButton();
      await SnapSendActionSheet.sendActionInputAddress(RECIPIENT_ADDRESS);
      await SnapSendActionSheet.sendActionInputAmount(TRANSFER_AMOUNT);
      await TestHelpers.delay(4000);
      await SnapSendActionSheet.tapContinueButton();
      // Snap UI components prove tricky for testID's require more time
      await SnapSendActionSheet.tapSendSOLTransactionButton();
      // Assert transaction is sent
      await Assertions.checkIfTextIsDisplayed(EXPECTED_CONFIRMATION);
    });

    it('Should verify that transaction is sent successfully', async () => {
      await TestHelpers.delay(4000);
      await SnapSendActionSheet.tapCloseButton();
      await TabBarComponent.tapActivity();
      await ActivitiesView.tapOnTransactionItem(RECENT_TRANSACTION_INDEX);
      await Assertions.checkIfTextIsDisplayed(RECIPIENT_SHORT_ADDRESS);
    });
  },
);
