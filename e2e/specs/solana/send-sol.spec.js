'use strict';
import { SmokeNetworkExpansion } from '../../tags';
import WalletView from '../../pages/wallet/WalletView';
import AmountView from '../../pages/Send/AmountView';
import ActivitiesView from '../../pages/Transactions/ActivitiesView';
import SendView from '../../pages/Send/SendView';
import TransactionConfirmationView from '../../pages/Send/TransactionConfirmView';
import { importWalletWithRecoveryPhrase, loginToApp } from '../../viewHelper';
import FixtureBuilder from '../../fixtures/fixture-builder';
import {
  loadFixture,
  startFixtureServer,
  stopFixtureServer,
} from '../../fixtures/fixture-helper';
import Assertions from '../../utils/Assertions';
import SolanaNewFeatureSheet from '../../pages/wallet/SolanaNewFeatureSheet';
import TestHelpers from '../../helpers';
import EnableAutomaticSecurityChecksView from '../../pages/Onboarding/EnableAutomaticSecurityChecksView';
import {
  SolanaNewFeatureSheetSelectorsIDs,
  SolanaNewFeatureSheetSelectorsText,
} from '../../selectors/wallet/SolanaNewFeatureSheet.selectors';
import Gestures from '../../utils/Gestures';
import AccountListBottomSheet from '../../pages/wallet/AccountListBottomSheet';
import AddNewHdAccountComponent from '../../pages/wallet/MultiSrp/AddAccountToSrp/AddNewHdAccountComponent';
import AddAccountBottomSheet from '../../pages/wallet/AddAccountBottomSheet';
import NetworkEducationModal from '../../pages/Network/NetworkEducationModal';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import WalletActionsBottomSheet from '../../pages/wallet/WalletActionsBottomSheet';
import { SendViewSelectorsIDs } from '../../selectors/SendFlow/SendView.selectors';
import { SendLinkViewSelectorsIDs } from '../../selectors/Receive/SendLinkView.selectors';

describe(
  SmokeNetworkExpansion('Should be able to send SOL to another Solana account'),
  () => {
    beforeAll(async () => {
      jest.setTimeout(150000);
      await TestHelpers.launchApp();
    });

    const ACCOUNT_ONE_TEXT = 'Solana Account 1';
    const ACCOUNT_TWO_TEXT = 'Solana Account 2';
    const INVALID_ADDRESS = 'invalid address';
    const INVALID_ADDRESS_ERROR = 'Invalid Solana address';
    const PUBLIC_RECIEVE_ADDRESS =
      'GxE7wWLyUEV4jMqQUMj8kT1XVpcfxq4iWBTVDTwCV77M';

    it('should import wallet and go to the wallet view', async () => {
      await importWalletWithRecoveryPhrase({
        // seedPhrase: process.env.MM_SOLANA_E2E_TEST_SRP,
        seedPhrase:
          'snow excuse galaxy hunt plunge sock obey armor alarm hawk fiscal table',
      });
    });

    it('should assert Solana announcement sheet and create accounts', async () => {
      await Assertions.checkIfVisible(
        SolanaNewFeatureSheetSelectorsIDs.SOLANA_NEW_FEATURE_SHEET,
      );
      await Assertions.checkIfVisible(
        SolanaNewFeatureSheetSelectorsIDs.SOLANA_CARASOULE_LOGO,
      );
      //   await SolanaNewFeatureSheet.tapNotNowButton(); //TODO: Figure out why testID is not working
      await device.disableSynchronization();
      await SolanaNewFeatureSheet.swipeWithCarouselLogo();
      await device.enableSynchronization();
      await WalletView.tapIdenticon();
      await device.disableSynchronization();
      await AccountListBottomSheet.tapAddAccountButton();
      await AddAccountBottomSheet.tapAddSolanaAccount();
      await AddNewHdAccountComponent.tapConfirm();
      await NetworkEducationModal.tapGotItButton();
      await device.enableSynchronization();
      // Assert account created, which is an existing account with SOL
      await Assertions.checkIfTextRegexExists(ACCOUNT_ONE_TEXT, 1);
    });

    it('should check validation of invalid address', async () => {
      await TabBarComponent.tapActions();
      await WalletActionsBottomSheet.tapSendButton();
      await SendView.inputSolanaAddress(INVALID_ADDRESS);
      await Assertions.checkIfElementToHaveText(
        SendView.invalidAddressError,
        INVALID_ADDRESS_ERROR,
      );
      // TODOSnap UI components prove tricky for testID's require more time
      await Gestures.waitAndTapByTextPrefix('Cancel');
    });

    it('should send SOL from send account to receive account', async () => {
      await WalletActionsBottomSheet.tapSendButton();
      await SendView.inputSolanaAddress(PUBLIC_RECIEVE_ADDRESS);
      await SendView.inputSolanaAmount('0.001');

      // Snap UI components prove tricky for testID's require more time
      await Gestures.waitAndTapByTextPrefix('Continue');
      await Assertions.checkIfTextIsDisplayed(
        SendViewSelectorsIDs.SOL_CONFIRM_SEND_VIEW,
      );
      // Snap UI components prove tricky for testID's require more time
      await SendView.tapSendSOLTransactionButton();
      // Assert transaction is sent
      await Assertions.checkIfTextIsDisplayed(
        element(
          by.text(new RegExp(`^${'0.0009 SOL was successfully sent'}.*`)),
        ),
      );
    });
  },
);
