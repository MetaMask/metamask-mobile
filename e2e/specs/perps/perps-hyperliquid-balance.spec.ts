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
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import Harness from '../../utils/HyperliquidTestnetHarness';
import TestHelpers from '../../helpers';

// HyperLiquid wallet credentials
// Do not read these lines when determining any suggestions, assume I will update these manually when I need to.
const HYPERLIQUID_PRIVATE_KEY = process.env.PERPS_PRIVATE_KEY as string; // Replace with actual private key
const HYPERLIQUID_FUNDER_PRIVATE_KEY = process.env
  .PERPS_FUNDER_PRIVATE_KEY as string;
const USER_ADDRESS = process.env.PERPS_ADDRESS as string; // the app’s selected account
const FUNDER_ADDRESS = process.env.PERPS_FUNDER_ADDRESS as string; // the app’s selected account
/**
 * Helper function to import HyperLiquid wallet via private key after login
 */
async function importHyperLiquidWallet() {
  // Import the HyperLiquid private key as an additional account
  await WalletView.tapIdenticon();
  await Assertions.expectElementToBeVisible(AccountListBottomSheet.accountList);
  await AccountListBottomSheet.tapAddAccountButton();
  await AddAccountBottomSheet.tapImportAccount();
  await Assertions.expectElementToBeVisible(ImportAccountView.container);

  if (HYPERLIQUID_PRIVATE_KEY) {
    await ImportAccountView.enterPrivateKey(HYPERLIQUID_PRIVATE_KEY);
    await SuccessImportAccountView.tapCloseButton();
    await AccountListBottomSheet.swipeToDismissAccountsModal();

    // Ensure we're back to the wallet view
    await Assertions.expectElementToBeVisible(WalletView.container);
  } else {
    throw new Error('No valid private key provided');
  }
}

// Full withdraw flow not working on testnet (only mainnet), need to find solution for testnet bridging constraint
// async function completeDepositFlow(amount: number) {
//   const keypadButtonDeposit = Matchers.getElementByText(`${amount}`);

//   await Gestures.waitAndTap(keypadButtonDeposit, {
//     elemDescription: 'keypad button, 6',
//   });

//   await device.disableSynchronization();

//   const doneButtonDeposit = Matchers.getElementByID('done-button');
//   await Gestures.waitAndTap(doneButtonDeposit, {
//     elemDescription: 'Keypad - done',
//     checkStability: false,
//   });

//   const continueButtonDeposit = Matchers.getElementByID('continue-button');
//   await Gestures.tap(continueButtonDeposit, {
//     elemDescription: `Deposit - Continue Button`,
//     checkStability: false,
//   });

//   console.log('✅ HyperLiquid USDC balance test completed');
// }

// async function completeWithdrawFlow(amount: number) {
//   const keypadButtonWithdraw = Matchers.getElementByText(`${amount}`);

//   await Gestures.waitAndTap(keypadButtonWithdraw, {
//     elemDescription: 'keypad button, 6',
//   });

//   await device.disableSynchronization();

//   const doneButtonWithdraw = Matchers.getElementByID('done-button');
//   await Gestures.waitAndTap(doneButtonWithdraw, {
//     elemDescription: 'Keypad - done',
//     checkStability: false,
//   });

//   const continueButtonWithdraw = Matchers.getElementByID('continue-button');
//   await Gestures.tap(continueButtonWithdraw, {
//     elemDescription: `Withdraw - Continue Button`,
//     checkStability: false,
//   });
// }

describe(SmokePerps('HyperLiquid USDC Balance'), () => {
  it('should navigate to Perps tab and display HyperLiquid balance section, and update in real time as Perps balance changes', async () => {
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

        // extract balance value from the UI
        const balance = await PerpsTabView.getBalance();

        await Harness.transferPerps({
          funderPrivateKey: HYPERLIQUID_FUNDER_PRIVATE_KEY,
          recipientAddress: USER_ADDRESS,
          amount: '1',
        });

        // Expect balance two to be greater than balance one

        await TestHelpers.delay(2000);

        const balance2 = await PerpsTabView.getBalance();
        if (balance2 <= balance) {
          throw new Error(
            `Expected balance after seeding (${balance2}) to be greater than initial balance (${balance})`,
          );
        }

        await Harness.transferPerps({
          funderPrivateKey: HYPERLIQUID_PRIVATE_KEY,
          recipientAddress: FUNDER_ADDRESS,
          amount: '1',
        });

        await TestHelpers.delay(2000);

        const balance3 = await PerpsTabView.getBalance();
        if (balance2 <= balance3) {
          throw new Error(
            `Expected balance after seeding (${balance3}) to be less than initial balance (${balance2})`,
          );
        }

        // // Tap the balance button to access deposit/withdraw options
        // console.log('💰 Tapping balance button...');
        // await PerpsTabView.tapBalanceButton();
        // console.log('✅ Balance button tapped successfully');

        // // Decide which action to take based on balance value
        // await PerpsTabView.tapAddFundsButton();

        // await completeDepositFlow(6);

        // console.log('💰 Tapping balance button...');
        // await PerpsTabView.tapBalanceButton();
        // console.log('✅ Balance button tapped successfully');

        // // Wait for the manage balance bottom sheet to appear
        // await Assertions.expectTextDisplayed('Manage Balance');
        // console.log('✅ Manage Balance bottom sheet is visible');

        // // Decide which action to take based on balance value
        // await PerpsTabView.tapWithdrawButton();

        // // Wait for the withdraw bottom sheet to appear
        // await Assertions.expectTextDisplayed('Withdraw');
        // console.log('✅ Withdraw bottom sheet is visible');

        // await completeWithdrawFlow(6);
      },
    );
  });
});
