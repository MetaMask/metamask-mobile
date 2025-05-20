'use strict';
import { SmokeNetworkExpansion } from '../../tags';
import WalletView from '../../pages/wallet/WalletView';
import SendView from '../../pages/Send/SendView';
import { importWalletWithRecoveryPhrase, loginToApp } from '../../viewHelper';
import Assertions from '../../utils/Assertions';
import SolanaNewFeatureSheet from '../../pages/wallet/SolanaNewFeatureSheet';
import TestHelpers from '../../helpers';
import {
  SolanaNewFeatureSheetSelectorsIDs,
} from '../../selectors/wallet/SolanaNewFeatureSheet.selectors';
import Gestures from '../../utils/Gestures';
import AccountListBottomSheet from '../../pages/wallet/AccountListBottomSheet';
import AddNewHdAccountComponent from '../../pages/wallet/MultiSrp/AddAccountToSrp/AddNewHdAccountComponent';
import AddAccountBottomSheet from '../../pages/wallet/AddAccountBottomSheet';
import NetworkEducationModal from '../../pages/Network/NetworkEducationModal';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import WalletActionsBottomSheet from '../../pages/wallet/WalletActionsBottomSheet';
import { SendViewSelectorsIDs } from '../../selectors/SendFlow/SendView.selectors';
import ActivitiesView from '../../pages/Transactions/ActivitiesView';
import SnapSendActionSheet from '../../pages/wallet/SendActionBottomSheet';
import { SendActionViewSelectorsIDs } from '../../selectors/SendFlow/SendActionView.selectors';

// Test constants
const SOLANA_ACCOUNT_NAME = 'Solana Account 1';
const INVALID_ADDRESS = 'invalid address';
const INVALID_ADDRESS_ERROR = 'Invalid Solana address';
const RECIPIENT_ADDRESS = 'GxE7wWLyUEV4jMqQUMj8kT1XVpcfxq4iWBTVDTwCV77M';
const TRANSFER_AMOUNT = '0.0011';
const EXPECTED_CONFIRMATION = '0.0011 SOL was successfully sent';
const RECIPIENT_SHORT_ADDRESS = 'GxE7wWL...CV77M';
const RECENT_TRANSACTION_INDEX = 0;

describe(
  SmokeNetworkExpansion('Solana Token Transfer Functionality'),
  () => {
    beforeAll(async () => {
      jest.setTimeout(150000);
      await TestHelpers.launchApp();
    });

    it('should import wallet with Solana support', async () => {
      await importWalletWithRecoveryPhrase({
        seedPhrase: process.env.MM_SOLANA_E2E_TEST_SRP,
      });
    });

    it('should navigate through Solana onboarding and create a Solana account', async () => {
      await WalletView.tapIdenticon();
      await AccountListBottomSheet.tapAddAccountButton();
      await AddAccountBottomSheet.tapAddSolanaAccount();
      await AddNewHdAccountComponent.tapConfirm();
      await NetworkEducationModal.tapGotItButton();
      // Assert account created, which is an existing account with SOL
      await Assertions.checkIfTextIsDisplayed(SOLANA_ACCOUNT_NAME, 1);
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
      await TestHelpers.delay(2000);
      await SnapSendActionSheet.tapContinueButton();
      await Assertions.checkIfTextIsDisplayed(
        SendActionViewSelectorsIDs.SOL_CONFIRM_SEND_VIEW,
      );
      // Snap UI components prove tricky for testID's require more time
      await SnapSendActionSheet.tapSendSOLTransactionButton();
      // Assert transaction is sent
      await Assertions.checkIfTextIsDisplayed(EXPECTED_CONFIRMATION);
    });

    it('Should verify that transaction is sent successfully', async () => {
      await SnapSendActionSheet.tapCloseButton();
      await TabBarComponent.tapActivity();
      // await ActivitiesView.tapOnTransactionValue(TRANSFER_AMOUNT + ' SOL');
      await ActivitiesView.tapOnTransactionItem(RECENT_TRANSACTION_INDEX);

      await Assertions.checkIfTextIsDisplayed(RECIPIENT_SHORT_ADDRESS);
    
    });
  },
);