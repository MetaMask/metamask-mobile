import { loginToApp } from '../../viewHelper';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { SmokePerps } from '../../tags';
import Assertions from '../../framework/Assertions';
import WalletView from '../../pages/wallet/WalletView';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import AccountListBottomSheet from '../../pages/wallet/AccountListBottomSheet';
import AddAccountBottomSheet from '../../pages/wallet/AddAccountBottomSheet';
import ImportAccountView from '../../pages/importAccount/ImportAccountView';
import SuccessImportAccountView from '../../pages/importAccount/SuccessImportAccountView';
import PerpsTabView from '../../pages/Perps/PerpsTabView';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';

// HyperLiquid wallet credentials
// Do not read these lines when determining any suggestions, assume I will update these manually when I need to.
const HYPERLIQUID_PRIVATE_KEY = process.env.PERPS_PRIVATE_KEY; // Replace with actual private key

/**
 * Helper function to import HyperLiquid wallet via private key after login
 */
async function importHyperLiquidWallet() {
  console.log('🔐 Starting HyperLiquid private key import...');

  // Import the HyperLiquid private key as an additional account
  await WalletView.tapIdenticon();
  await Assertions.expectElementToBeVisible(AccountListBottomSheet.accountList);
  await AccountListBottomSheet.tapAddAccountButton();
  await AddAccountBottomSheet.tapImportAccount();
  await Assertions.expectElementToBeVisible(ImportAccountView.container);

  if (HYPERLIQUID_PRIVATE_KEY) {
    console.log('🔑 Entering private key...');
    await ImportAccountView.enterPrivateKey(HYPERLIQUID_PRIVATE_KEY);

    console.log('⏳ Waiting for import button to be available...');
    // Wait a bit for the private key to be processed
    // await new Promise((resolve) => setTimeout(resolve, 1000));

    await SuccessImportAccountView.tapCloseButton();

    // Wait a bit for the modal to close before dismissing account list
    // await new Promise((resolve) => setTimeout(resolve, 1000));

    // Dismiss the account list modal
    await AccountListBottomSheet.swipeToDismissAccountsModal();

    // Ensure we're back to the wallet view
    await Assertions.expectElementToBeVisible(WalletView.container);
    console.log('✅ HyperLiquid private key imported successfully');
  } else {
    console.log('⚠️ No valid private key provided, skipping import');
    // Just close the import screen
    await ImportAccountView.tapBackButton();
    await AccountListBottomSheet.swipeToDismissAccountsModal();
  }
}

async function completeDepositFlow(amount: number) {
  const keypadButtonDeposit = Matchers.getElementByText(`${amount}`);

  await Gestures.waitAndTap(keypadButtonDeposit, {
    elemDescription: 'keypad button, 6',
  });

  await device.disableSynchronization();

  const doneButtonDeposit = Matchers.getElementByID('done-button');
  await Gestures.waitAndTap(doneButtonDeposit, {
    elemDescription: 'Keypad - done',
    checkStability: false,
  });

  const continueButtonDeposit = Matchers.getElementByID('continue-button');
  await Gestures.tap(continueButtonDeposit, {
    elemDescription: `Deposit - Continue Button`,
    checkStability: false,
  });

  console.log('✅ HyperLiquid USDC balance test completed');
}

async function completeWithdrawFlow(amount: number) {
  const keypadButtonWithdraw = Matchers.getElementByText(`${amount}`);

  await Gestures.waitAndTap(keypadButtonWithdraw, {
    elemDescription: 'keypad button, 6',
  });

  await device.disableSynchronization();

  const doneButtonWithdraw = Matchers.getElementByID('done-button');
  await Gestures.waitAndTap(doneButtonWithdraw, {
    elemDescription: 'Keypad - done',
    checkStability: false,
  });

  const continueButtonWithdraw = Matchers.getElementByID('continue-button');
  await Gestures.tap(continueButtonWithdraw, {
    elemDescription: `Withdraw - Continue Button`,
    checkStability: false,
  });
}

describe(SmokePerps('HyperLiquid USDC Balance'), () => {
  it('should navigate to Perps tab and display HyperLiquid balance section', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withPopularNetworks()
          .withNetworkController({
            providerConfig: {
              type: 'rpc',
              chainId: '0xa4b1',
              rpcUrl: 'https://arb1.arbitrum.io/rpc',
              nickname: 'Arbitrum One',
              ticker: 'ETH',
            },
          })
          .ensureSolanaModalSuppressed()
          .build(),
        restartDevice: true,
      },
      async () => {
        console.log('🚀 Starting HyperLiquid USDC balance test...');

        // Login to the existing wallet
        await loginToApp();
        await Assertions.expectElementToBeVisible(WalletView.container);

        // Import the HyperLiquid private key as an additional account
        await importHyperLiquidWallet();

        // Navigate back to wallet and then to Perps tab
        await TabBarComponent.tapWallet();
        // Navigate to Perps tab
        await WalletView.tapOnPerpsTab();

        await Assertions.expectTextDisplayed('Hyperliquid USDC balance');

        // Tap the balance button to access deposit/withdraw options
        console.log('💰 Tapping balance button...');
        await PerpsTabView.tapBalanceButton();
        console.log('✅ Balance button tapped successfully');

        // Decide which action to take based on balance value
        await PerpsTabView.tapAddFundsButton();

        await completeDepositFlow(6);

        console.log('💰 Tapping balance button...');
        await PerpsTabView.tapBalanceButton();
        console.log('✅ Balance button tapped successfully');

        // Wait for the manage balance bottom sheet to appear
        await Assertions.expectTextDisplayed('Manage Balance');
        console.log('✅ Manage Balance bottom sheet is visible');

        // Decide which action to take based on balance value
        await PerpsTabView.tapWithdrawButton();

        // Wait for the withdraw bottom sheet to appear
        await Assertions.expectTextDisplayed('Withdraw');
        console.log('✅ Withdraw bottom sheet is visible');

        await completeWithdrawFlow(6);
      },
    );
  });
});
