import { SmokeLedger } from '../../tags';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import {
  withSpeculosFixtures,
  importLedgerAccount,
  LEDGER_ACCOUNT_ADDRESS,
  type SpeculosTestSuiteParams,
} from '../../framework/fixtures/SpeculosFixtureHelper';
import WalletView from '../../page-objects/wallet/WalletView';
import SendView from '../../page-objects/Send/RedesignedSendView';
import HardwareWalletBottomSheet from '../../page-objects/Ledger/HardwareWalletBottomSheet';
import Assertions from '../../framework/Assertions';
import TestHelpers from '../../helpers';
import { AnvilManager, DEFAULT_ANVIL_PORT } from '../../seeder/anvil-manager';

const logger = {
  debug: (msg: string) =>
    process.stdout.write(`[LEDGER-SEND] ${new Date().toISOString()} ${msg}\n`),
};

jest.setTimeout(900000);

const RECIPIENT = '0x0c54fccd2e384b4bb6f2e405bf5cbc15a017aafb';
const LOCAL_CHAIN_ID = '0x539';
// 1000 ETH in Wei (0x3635c9adc5dea00000)
const ONE_THOUSAND_ETH_WEI = '0x3635c9adc5dea00000';

const describeIf = process.env.LEDGER_E2E === '1' ? describe : describe.skip;

describeIf(SmokeLedger('Send ETH from Ledger account'), () => {
  it('should send ETH from a Ledger account via Speculos', async () => {
    await withSpeculosFixtures(
      {
        fixture: () => {
          const fixture = new FixtureBuilder()
            .withDefaultFixture()
            .withNoAutoLock()
            .withNetworkController({
              chainId: LOCAL_CHAIN_ID,
              rpcUrl: `http://localhost:${DEFAULT_ANVIL_PORT}`,
              type: 'custom',
              nickname: 'Local RPC',
              ticker: 'ETH',
            })
            .withNetworkEnabledMap({ eip155: { [LOCAL_CHAIN_ID]: true } })
            .build();

          return fixture;
        },
        startSpeculos: true,
        enableLocalNode: true,
      },
      async ({ speculos, localNodes }: SpeculosTestSuiteParams) => {
        // Ensure Speculos Ethereum app is on main screen with blind signing enabled.
        // NVRAM from previous runs may leave the app in settings/blind-signing screen.
        logger.debug('taking pre-blind-signing screenshot...');
        const preScreenshot = await speculos.takeScreenshot();
        logger.debug(
          `pre-blind-signing screenshot: ${preScreenshot.length} bytes`,
        );

        await speculos.enableBlindSigning();
        logger.debug('blind signing enabled');

        const postScreenshot = await speculos.takeScreenshot();
        logger.debug(
          `post-blind-signing screenshot: ${postScreenshot.length} bytes`,
        );

        await importLedgerAccount();
        logger.debug('import complete');

        await TestHelpers.delay(5000);

        const anvilNode = localNodes?.[0] as unknown as AnvilManager;
        if (anvilNode && anvilNode instanceof AnvilManager) {
          // Anvil pre-funds the first account from SPECULOS_SEED with 1000 ETH
          // The Ledger address is derived from that seed, so it already has balance
          logger.debug(
            `Anvil running, Ledger account should have 1000 ETH pre-funded`,
          );
        }

        // Wait for ATC to sync (polls every 10s) after account import.
        // Longer wait needed for hardware wallet accounts on custom networks.
        logger.debug('waiting for balance sync (60s)...');
        await TestHelpers.delay(60000);

        await Assertions.expectElementToBeVisible(WalletView.container, {
          timeout: 60000,
        });
        logger.debug('wallet visible');

        // Quick network check
        const localRpcVisible = await waitFor(element(by.text('Local RPC')))
          .toExist()
          .withTimeout(5000)
          .then(() => true)
          .catch(() => false);
        logger.debug(`Local RPC: ${localRpcVisible}`);

        await device.takeScreenshot('01_wallet_loaded');

        // After importLedgerAccount, multiple screens may be stacked:
        // 1. Account list bottom sheet
        // 2. "Connect a hardware wallet" selection screen
        // 3. Wallet screen (bottom)
        // We need to dismiss all of them to get back to the wallet.
        logger.debug('navigating back to wallet...');

        // First dismiss account list if visible
        const accountListOpen = await waitFor(element(by.id('account-list')))
          .toBeVisible()
          .withTimeout(10000)
          .then(() => true)
          .catch(() => false);

        if (accountListOpen) {
          await device.takeScreenshot('03_account_list_open');
          logger.debug('account-list visible, pressing back');
          await device.pressBack();
          await TestHelpers.delay(2000);
        }

        // Check if we're on "Connect a hardware wallet" screen
        const hwScreenVisible = await waitFor(
          element(by.text('Connect a hardware wallet')),
        )
          .toBeVisible()
          .withTimeout(5000)
          .then(() => true)
          .catch(() => false);

        if (hwScreenVisible) {
          logger.debug('hardware wallet screen visible, pressing back');
          await device.pressBack();
          await TestHelpers.delay(2000);
        }

        // Keep pressing back until we're past all hardware wallet screens
        for (let attempt = 0; attempt < 5; attempt++) {
          const hwScreen = await waitFor(
            element(by.text('Connect a hardware wallet')),
          )
            .toBeVisible()
            .withTimeout(3000)
            .then(() => true)
            .catch(() => false);

          if (hwScreen) {
            logger.debug(
              `hw screen still visible (attempt ${attempt + 1}), pressing back`,
            );
            await device.pressBack();
            await TestHelpers.delay(2000);
          } else {
            logger.debug('hardware wallet screen dismissed');
            break;
          }
        }

        await Assertions.expectElementToBeVisible(WalletView.container, {
          timeout: 10000,
        });
        logger.debug('wallet screen confirmed');

        await device.takeScreenshot('04_wallet_before_send');

        await device.disableSynchronization();

        // Send flow: tap wallet send button → asset selection → select native token
        logger.debug('tapping wallet send button...');
        await WalletView.tapWalletSendButton();
        logger.debug('tapped wallet send button');
        await TestHelpers.delay(5000);
        await device.takeScreenshot('04a_asset_selection');

        // On the asset selection screen, select the native testnet ETH token.
        // The token row has testID="asset-ETH" via getAssetTestId(asset.symbol).
        // May take time to appear while AssetsController detects native ETH.
        logger.debug('selecting native ETH token...');
        const ethToken = element(by.id('asset-ETH'));
        await waitFor(ethToken).toBeVisible().withTimeout(60000);
        await ethToken.tap();
        logger.debug('tapped asset-ETH');

        await TestHelpers.delay(5000);
        await device.takeScreenshot('04c_after_token_select');

        // Amount screen should appear
        await Assertions.expectElementToBeVisible(SendView.amountInputField, {
          timeout: 60000,
        });
        await TestHelpers.delay(2000);
        await device.takeScreenshot('05_amount_screen');
        logger.debug('amount screen loaded');

        await SendView.enterAmountViaKeypad('1');
        await TestHelpers.delay(2000);

        await SendView.pressContinueButton();
        logger.debug('continue pressed');

        await SendView.inputRecipientAddress(RECIPIENT);

        await SendView.pressReviewButton();
        logger.debug('review pressed');

        await TestHelpers.delay(5000);
        await device.takeScreenshot('06_after_review');

        // The Review button navigates to the confirmation screen.
        // For Ledger accounts, pressing Confirm triggers the HW device flow.
        const confirmButton = element(by.id('confirm-button'));
        await waitFor(confirmButton).toBeVisible().withTimeout(30000);
        await confirmButton.tap();
        logger.debug('confirm pressed');

        await TestHelpers.delay(3000);
        await device.takeScreenshot('07_after_confirm');

        // Wait for ANY HW bottom sheet state (scanning, connecting, etc.)
        await HardwareWalletBottomSheet.waitForVisible(90000);
        await TestHelpers.delay(2000);
        await device.takeScreenshot('08_hw_bottom_sheet');
        logger.debug('hw bottom sheet visible');

        // If in device-selection state, select the virtual device
        try {
          await HardwareWalletBottomSheet.waitForDeviceSelection(10000);
          await HardwareWalletBottomSheet.selectVirtualDevice();
          await TestHelpers.delay(2000);
          await HardwareWalletBottomSheet.tapConnect();
        } catch {
          logger.debug(
            'device-selection not shown, bottom sheet may be in connecting/awaiting state',
          );
          await device.takeScreenshot('08a_no_device_selection');
        }

        await Assertions.expectElementToBeVisible(
          HardwareWalletBottomSheet.awaitingConfirmationContent,
          { timeout: 120000 },
        );
        logger.debug('awaiting confirmation');

        await speculos.approveTransaction();

        await Assertions.expectElementToNotBeVisible(
          HardwareWalletBottomSheet.container,
          {
            timeout: 120000,
            description: 'HW bottom sheet closed after signing',
          },
        );
        logger.debug('SUCCESS');
      },
    );
  });
});
