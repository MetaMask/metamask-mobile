import { SmokeNetworkExpansion } from '../../tags';
import { importWalletWithRecoveryPhrase } from '../../page-objects/viewHelper.ts';
import Assertions from '../../framework/Assertions';
import TestHelpers from '../../helpers';
import TabBarComponent from '../../page-objects/wallet/TabBarComponent';
import WalletView from '../../page-objects/wallet/WalletView';
import ActivitiesView from '../../page-objects/Transactions/ActivitiesView';
import SnapSendActionSheet from '../../page-objects/wallet/SendActionBottomSheet';
import NetworkEducationModal from '../../page-objects/Network/NetworkEducationModal';
import AccountListBottomSheet from '../../page-objects/wallet/AccountListBottomSheet';
import AddAccountBottomSheet from '../../page-objects/wallet/AddAccountBottomSheet';
import AddNewHdAccountComponent from '../../page-objects/wallet/MultiSrp/AddAccountToSrp/AddNewHdAccountComponent';

// Test constants
const INVALID_ADDRESS = 'invalid address';
const INVALID_ADDRESS_ERROR = 'Invalid Solana address or domain name';
const RECIPIENT_ADDRESS = 'EjiyBUWeEXPBJT5cB2jzbm6pmbBxWuyVyVBGasSGgtXt';
const TRANSFER_AMOUNT = '0.002';
const EXPECTED_CONFIRMATION = '0.002 SOL was successfully sent';
const RECIPIENT_SHORT_ADDRESS = 'EjiyBUW...GgtXt';
const RECENT_TRANSACTION_INDEX = 0;

// Quarantining for GNS feature
// Failing on IOS, Passes on Android
describe.skip(
  SmokeNetworkExpansion('Solana Token Transfer Functionality'),
  () => {
    beforeAll(async () => {
      jest.setTimeout(150000);
      await TestHelpers.launchApp();
    });

    it('should import wallet with a Solana account', async () => {
      await importWalletWithRecoveryPhrase({
        seedPhrase: process.env.MM_SOLANA_E2E_TEST_SRP,
      });

      await WalletView.tapCurrentMainWalletAccountActions();
      await AccountListBottomSheet.tapAddAccountButton();
      await AddAccountBottomSheet.tapAddSolanaAccount();
      await AddNewHdAccountComponent.tapConfirm();

      await Assertions.expectElementToBeVisible(
        NetworkEducationModal.container,
      );
      await NetworkEducationModal.tapGotItButton();

      await WalletView.tapCurrentMainWalletAccountActions();
      await AccountListBottomSheet.tapToSelectActiveAccountAtIndex(1);
    });

    it.skip('should validate recipient address format correctly', async () => {
      await WalletView.tapWalletSendButton();
      await SnapSendActionSheet.sendActionInputAddress(INVALID_ADDRESS);
      await Assertions.expectElementToHaveText(
        SnapSendActionSheet.invalidAddressError,
        INVALID_ADDRESS_ERROR,
      );
      // Snap UI components prove tricky for testID's
      await SnapSendActionSheet.tapCancelButton();
    });

    // Skipped due to the test being targetting a live network. This should be re-enabled once we have local Solana node
    it.skip('should successfully transfer SOL to a valid recipient address', async () => {
      await WalletView.tapWalletSendButton();
      await SnapSendActionSheet.sendActionInputAddress(RECIPIENT_ADDRESS);
      await SnapSendActionSheet.sendActionInputAmount(TRANSFER_AMOUNT);

      await SnapSendActionSheet.tapContinueButton();
      // Snap UI components prove tricky for testID's require more time

      await SnapSendActionSheet.tapSendSOLTransactionButton();
      // Assert transaction is sent
      await Assertions.expectTextDisplayed(EXPECTED_CONFIRMATION);
    });

    // Skipped due to the test being targetting a live network. This should be re-enabled once we have local Solana node
    it.skip('should verify that transaction is sent successfully', async () => {
      await SnapSendActionSheet.tapCloseButton();
      await TabBarComponent.tapActivity();
      await ActivitiesView.tapOnTransactionItem(RECENT_TRANSACTION_INDEX);
      await Assertions.expectTextDisplayed(RECIPIENT_SHORT_ADDRESS);
    });
  },
);
