import { SmokeQr } from '../../tags';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import {
  loginToAppWithSyncDisabled,
  waitForAppReadySpeculos,
} from '../../framework/fixtures/SpeculosFixtureHelper';
import WalletView from '../../page-objects/detox/wallet/WalletView';
import AccountListBottomSheet from '../../page-objects/detox/wallet/AccountListBottomSheet';
import LedgerConnectView from '../../page-objects/Ledger/LedgerConnectView';
import QRHardwareConnectView from '../../page-objects/QRHardware/QRHardwareConnectView';
import Assertions from '../../framework/detox/Assertions';
import TestHelpers from '../../helpers';

import { execSync } from 'child_process';

const describeIf = process.env.QR_E2E === '1' ? describe : describe.skip;

jest.setTimeout(900000);

const logger = {
  debug: (msg: string) =>
    process.stdout.write(`[QR-IMPORT] ${new Date().toISOString()} ${msg}\n`),
};

/**
 * Expected address for the QR emulator's default account.
 * Imported from the same @metamask/hw-emulator package that the render script
 * (`scripts/qr-emulator/render-account-ur.js`) drives. Matches Hardhat/Anvil
 * account #0 for the canonical test seed.
 */
const QR_EMULATOR_ADDRESS =
  '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

describeIf(SmokeQr('Import QR hardware account via camera injection'), () => {
  it('discovers and imports a QR account using the emulator-rendered QR', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withDefaultFixture().build(),
        restartDevice: true,
      },
      async () => {
        // Disable synchronization — the app has continuous background
        // activity (snap/controller persistence) that prevents Detox
        // from ever considering it "idle", which would block all interactions.
        await device.disableSynchronization();

        // Dismiss the Expo dev menu + RN dev menu that appear on first launch
        // of debug builds without the DevLauncher deep link's disableOnboarding param.
        // These are native overlays — Detox can't interact with them, so we use adb.
        logger.debug('Step 0: dismiss dev menus via adb');
        const deviceId = device.id ? `-s ${device.id}` : '';
        try {
          // Wait for the Metro bundle to download (~90s for 126MB debug bundle)
          // and the Expo dev menu to render. Poll for the dev menu via uiautomator.
          logger.debug('Waiting for dev menu to appear (Metro bundle download)...');
          let devMenuFound = false;
          for (let attempt = 0; attempt < 60; attempt++) {
            await TestHelpers.delay(3000);
            try {
              const dump = execSync(
                `adb ${deviceId} shell uiautomator dump /sdcard/devmenu.xml 2>/dev/null && adb ${deviceId} shell cat /sdcard/devmenu.xml`,
                { stdio: 'pipe', timeout: 5000 },
              ).toString();
              if (dump.includes('developer menu')) {
                devMenuFound = true;
                logger.debug(`Dev menu detected (attempt ${attempt + 1})`);
                break;
              }
            } catch {
              // uiautomator might fail while app is loading — keep polling
            }
          }

          if (devMenuFound) {
            // Tap "Continue" on the Expo dev menu
            execSync(`adb ${deviceId} shell input tap 540 2185`, { stdio: 'pipe' });
            logger.debug('Tapped Expo dev menu Continue');
            await TestHelpers.delay(2000);
            // Dismiss the RN dev menu that appears after
            execSync(`adb ${deviceId} shell input keyevent 4`, { stdio: 'pipe' });
            logger.debug('Dismissed RN dev menu');
            await TestHelpers.delay(3000);
          } else {
            logger.debug('Dev menu never appeared — continuing');
          }
        } catch (e) {
          logger.debug(`Dev menu dismissal error: ${e}`);
        }

        logger.debug('Step 1: waitForAppReadySpeculos');
        await waitForAppReadySpeculos(300000);

        logger.debug('Step 2: login');
        await loginToAppWithSyncDisabled();

        logger.debug('Step 3: open account list');
        await TestHelpers.delay(3000);
        await WalletView.tapIdenticon();
        await TestHelpers.delay(5000);

        await Assertions.expectElementToBeVisible(
          AccountListBottomSheet.accountList,
          { timeout: 60000 },
        );

        logger.debug('Step 4: tap add account');
        await AccountListBottomSheet.tapAddAccountButton();
        await TestHelpers.delay(5000);

        logger.debug('Step 5: tap add hardware wallet');
        await LedgerConnectView.tapAddHardwareWallet();
        await TestHelpers.delay(3000);

        logger.debug('Step 6: tap Keystone');
        await QRHardwareConnectView.tapKeystoneButton();
        await device.takeScreenshot('06_after_keystone_button');

        logger.debug('Step 7: tap Continue to open scanner');
        await QRHardwareConnectView.tapContinue();
        await device.takeScreenshot('07_scanner_opened');

        logger.debug('Step 8: assert scanner visible');
        await QRHardwareConnectView.assertScannerVisible();
        await device.takeScreenshot('08_scanner_confirmed');

        // The decode is driven by the thin-seam vision-camera mock, NOT a
        // real camera. The APK is built with `QR_E2E_THIN_SEAM=true`, which
        // makes Metro resolve `react-native-vision-camera` to
        // `tests/module-mocking/vision-camera/qr-thin-seam.ts`. That mock
        // auto-replays the 4 BC-UR account-UR fragments (from
        // `tests/fixtures/qr/account-ur-fragments.json`) into the scanner's
        // `onCodeScanned` callback on a timer, bypassing the camera + ML Kit.
        // The test just waits for the resulting account selector.
        logger.debug(
          'Step 9: waiting for account selector (camera decode signal)',
        );

        await QRHardwareConnectView.assertAccountImported();
        await device.takeScreenshot('09_account_imported');

        logger.debug(
          `SUCCESS — account imported. Expected address: ${QR_EMULATOR_ADDRESS}`,
        );
      },
    );
  });
});
