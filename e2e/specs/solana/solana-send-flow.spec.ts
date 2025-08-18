import { SmokeNetworkExpansion } from '../../tags';
import { importWalletWithRecoveryPhrase } from '../../viewHelper';
import Assertions from '../../framework/Assertions';
import TestHelpers from '../../helpers';
import WalletView from '../../pages/wallet/WalletView';
import SnapSendActionSheet from '../../pages/wallet/SendActionBottomSheet';
import NetworkEducationModal from '../../pages/Network/NetworkEducationModal';
import AccountListBottomSheet from '../../pages/wallet/AccountListBottomSheet';
import AddAccountBottomSheet from '../../pages/wallet/AddAccountBottomSheet';
import AddNewHdAccountComponent from '../../pages/wallet/MultiSrp/AddAccountToSrp/AddNewHdAccountComponent';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';

// Test constants
const INVALID_ADDRESS = 'invalid address';
const INVALID_ADDRESS_ERROR = 'Invalid Solana address or domain name';
const RECIPIENT_ADDRESS = 'EjiyBUWeEXPBJT5cB2jzbm6pmbBxWuyVyVBGasSGgtXt';
const TRANSFER_AMOUNT = '0.002';
// const EXPECTED_CONFIRMATION = '0.002 SOL was successfully sent';
// const RECIPIENT_SHORT_ADDRESS = 'EjiyBUW...GgtXt';
// const RECENT_TRANSACTION_INDEX = 0;

describe(SmokeNetworkExpansion('Solana Token Transfer Functionality'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
    await TestHelpers.launchApp();
  });

  it('should successfully validate recipient address and amount when sending SOL', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder({ onboarding: true }).build(),
        restartDevice: true,
        strictMockMode: true,
      },
      async () => {
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

        // Attempt to send SOL to an invalid address
        await WalletView.tapWalletSendButton();
        await SnapSendActionSheet.sendActionInputAddress(INVALID_ADDRESS);
        await Assertions.expectElementToHaveText(
          SnapSendActionSheet.invalidAddressError,
          INVALID_ADDRESS_ERROR,
          {
            description:
              'Invalid address error is displayed when using an invalid address',
          },
        );
        // Snap UI components prove tricky for testIDs
        await SnapSendActionSheet.tapCancelButton();

        // Attempt to send SOL to a valid address
        await WalletView.tapWalletSendButton();
        await SnapSendActionSheet.sendActionInputAddress(RECIPIENT_ADDRESS);
        await SnapSendActionSheet.sendActionInputAmount(TRANSFER_AMOUNT);

        await Assertions.expectTextDisplayed('Insufficient balance: 0 SOL', {
          description:
            'Confirmation message is displayed when sending a valid amount',
        });

        // This section can be turned back on when local nodes are sorted - We do manual sends on RC

        // await SnapSendActionSheet.tapContinueButton();
        // // Snap UI components prove tricky for testID's require more time

        // await SnapSendActionSheet.tapSendSOLTransactionButton();
        // // Assert transaction is sent
        // await Assertions.expectTextDisplayed(EXPECTED_CONFIRMATION);

        // // Verify the transaction in the activity log

        // await SnapSendActionSheet.tapCloseButton();
        // await TabBarComponent.tapActivity();
        // await ActivitiesView.tapOnTransactionItem(RECENT_TRANSACTION_INDEX);
        // await Assertions.expectTextDisplayed(RECIPIENT_SHORT_ADDRESS);
      },
    );
  });
});
