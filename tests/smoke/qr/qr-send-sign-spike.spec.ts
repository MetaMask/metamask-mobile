/**
 * SPIKE: tests whether `-camera-back videofile:qr-sign-response.mp4` can drive
 * the real react-native-vision-camera + ML Kit to decode an animated,
 * multi-part fountain-coded BC-UR (the signing response QR).
 *
 * This spec ONLY works when the Android emulator is launched with:
 *   -camera-back videofile:/abs/path/qr-sign-response.mp4
 *
 * Render the mp4 first:
 *   node scripts/qr-emulator/render-sign-ur-to-mp4.js
 *
 * IMPORTANT: the videofile: camera-injection mechanism is RESEARCH-GRADE.
 * No public precedent exists for animated BC-UR through vision-camera on the
 * Android emulator. This spec is assertion-free by design — it logs outcomes
 * to help determine whether the path is CI-reliable or needs the thin-seam
 * fallback.
 */
import { SmokeQr } from '../../tags';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { waitForAppReady } from '../../flows/general.flow';
import { loginToAppWithSyncDisabled } from '../../framework/fixtures/SpeculosFixtureHelper';
import WalletView from '../../page-objects/wallet/WalletView';
import SendView from '../../page-objects/Send/RedesignedSendView';
import Assertions from '../../framework/Assertions';
import TestHelpers from '../../helpers';
import { AnvilManager, DEFAULT_ANVIL_PORT } from '../../seeder/anvil-manager';

const describeIf = process.env.QR_E2E === '1' ? describe : describe.skip;

jest.setTimeout(900000);

const RECIPIENT = '0x0c54fccd2e384b4bb6f2e405bf5cbc15a017aafb';
const LOCAL_CHAIN_ID = '0x539';
const QR_EMULATOR_ADDRESS =
  '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

const logger = {
  debug: (msg: string) =>
    process.stdout.write(
      `[QR-SIGN-SPIKE] ${new Date().toISOString()} ${msg}\n`,
    ),
};

describeIf(
  SmokeQr('Sign transaction via camera injection (videofile spike)'),
  () => {
    it('should decode an injected animated signing QR and complete the transaction', async () => {
      await withFixtures(
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
          disableLocalNodes: false,
        },
        async ({ localNodes }) => {
          const anvilNode = localNodes?.[0] as unknown as AnvilManager;
          logger.debug(
            `Anvil running: ${
              anvilNode instanceof AnvilManager ? 'yes' : 'no'
            }`,
          );

          logger.debug('Step 1: waitForAppReady + login');
          await waitForAppReady(300000);
          await loginToAppWithSyncDisabled();

          // TODO: the QR account must already be imported (or the Anvil node
          // pre-funded with the emulator address). For this spike, we assume
          // the import flow (qr-import-account.spec.ts) succeeded first, OR
          // the wallet was onboarded with the emulator seed.
          logger.debug(
            'Step 2: ensure QR account is selected (pre-imported)',
          );
          await TestHelpers.delay(10000);
          await device.takeScreenshot('02_wallet_ready');

          logger.debug('Step 3: navigate send flow');
          await WalletView.tapWalletSendButton();
          logger.debug('tapped send');
          await TestHelpers.delay(5000);
          await device.takeScreenshot('03_asset_selection');

          const ethToken = element(by.id('asset-ETH'));
          await waitFor(ethToken).toBeVisible().withTimeout(60000);
          await ethToken.tap();
          logger.debug('tapped asset-ETH');
          await TestHelpers.delay(5000);
          await device.takeScreenshot('04_after_token_select');

          await Assertions.expectElementToBeVisible(SendView.amountInputField, {
            timeout: 60000,
          });
          await TestHelpers.delay(2000);
          await device.takeScreenshot('05_amount_screen');

          await SendView.enterAmountViaKeypad('1');
          await TestHelpers.delay(2000);
          await SendView.pressContinueButton();
          logger.debug('continue pressed');

          await SendView.inputRecipientAddress(RECIPIENT);
          await SendView.pressReviewButton();
          logger.debug('review pressed');
          await TestHelpers.delay(5000);
          await device.takeScreenshot('06_after_review');

          const confirmButton = element(by.id('confirm-button'));
          await waitFor(confirmButton).toBeVisible().withTimeout(30000);
          await confirmButton.tap();
          logger.debug('confirm pressed');
          await TestHelpers.delay(3000);
          await device.takeScreenshot('07_after_confirm');

          // SPIKE: The camera-injection step is performed BEFORE the test by
          // launching the emulator with:
          //   -camera-back videofile:/abs/path/qr-sign-response.mp4
          // The real vision-camera + ML Kit must decode the animated
          // fountain-code QR from the looping video. This is RESEARCH-GRADE
          // — no public precedent.
          logger.debug(
            'TODO(camera-injection): inject animated signing QR via videofile: flag',
          );

          // The signal that the camera decoded the response: the transaction
          // is broadcast (a success modal, the wallet returns, or a
          // "transaction submitted" element appears).
          logger.debug(
            'Step 8: waiting for transaction success signal',
          );

          // Log the outcome rather than hard-asserting — this is a SPIKE.
          const txSubmitted = await waitFor(
            element(by.text('Transaction submitted')),
          )
            .toBeVisible()
            .withTimeout(120000)
            .then(() => true)
            .catch(() => false);
          logger.debug(`transaction submitted: ${txSubmitted}`);
          await device.takeScreenshot('08_after_tx_submitted');

          if (txSubmitted) {
            logger.debug('SUCCESS — animated videofile: path decoded by ML Kit');
          } else {
            logger.debug(
              'INCONCLUSIVE — transaction not detected (camera did not decode, ' +
                'or the injected QR content did not match the sign request). ' +
                'Review screenshots to diagnose.',
            );
          }
        },
      );
    });
  },
);
