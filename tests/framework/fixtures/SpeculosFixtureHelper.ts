/* eslint-disable import-x/no-nodejs-modules */
import { execSync } from 'child_process';
import { resolve, join } from 'path';
import { withFixtures } from './FixtureHelper';
import {
  type WithFixturesOptions,
  type LocalNode,
  LocalNodeType,
} from '../types';
import TestHelpers from '../../helpers';
import { waitForAppReady } from '../../flows/general.flow';
import WalletView from '../../page-objects/wallet/WalletView';
import LoginView from '../../page-objects/wallet/LoginView';
import AccountListBottomSheet from '../../page-objects/wallet/AccountListBottomSheet';
import LedgerConnectView from '../../page-objects/Ledger/LedgerConnectView';
import Assertions from '../Assertions';
import { createLogger } from '../logger';
import type ContractAddressRegistry from '../../../app/util/test/contract-address-registry';
import type { Mockttp } from 'mockttp';
import type CommandQueueServer from './CommandQueueServer';
import {
  DockerManager,
  SpeculosBleRunner,
  SPECULOS_SEED as HW_EMULATOR_SEED,
  SPECULOS_LEDGER_ADDRESS as HW_EMULATOR_LEDGER_ADDRESS,
} from '@metamask/hw-emulator';

const logger = createLogger({ name: 'SpeculosFixtureHelper' });

/**
 * Source-of-truth directory for the `@metamask/hw-emulator` package, used by
 * `SpeculosBleRunner` to locate `python_src/` and the Python virtualenv.
 *
 * The package is resolved into `node_modules` via a Yarn `file:` resolution,
 * but a Python venv is non-portable, so it is created once at the source path
 * (`scripts/setup-python.sh`) and located at runtime via these env vars —
 * letting the runner find the real venv regardless of where the package was
 * copied. Override `HW_EMULATOR_SOURCE_DIR` to use a different local checkout.
 */
const HW_EMULATOR_SOURCE_DIR =
  process.env.HW_EMULATOR_SOURCE_DIR ??
  '/Users/montelai/consensys/accounts/packages/hw-emulator';
process.env.SPECULOS_BLE_PACKAGE_DIR ??= HW_EMULATOR_SOURCE_DIR;
process.env.SPECULOS_BLE_VENV_DIR ??= `${HW_EMULATOR_SOURCE_DIR}/.venv`;

const HW_EMULATOR_DIR = resolve(
  __dirname,
  '../../../node_modules/@metamask/hw-emulator',
);

export interface SpeculosConfig {
  speculosHost: string;
  speculosApiPort: number;
  speculosApduPort: number;
  controlApiPort: number;
  deviceName: string;
  device: string;
  elfFilename: string;
}

const DEFAULT_SPECULOS_CONFIG: SpeculosConfig = {
  speculosHost: '127.0.0.1',
  speculosApiPort: 5001,
  speculosApduPort: 9998,
  controlApiPort: 5002,
  deviceName: 'Ledger Nano X',
  device: 'nanox',
  elfFilename: 'ethereum-nanox.elf',
};

export const SPECULOS_MNEMONIC = HW_EMULATOR_SEED;

export const LEDGER_ACCOUNT_ADDRESS = HW_EMULATOR_LEDGER_ADDRESS;

export interface WithSpeculosFixturesOptions {
  speculos?: Partial<SpeculosConfig>;
  startSpeculos?: boolean;
  fixture?: WithFixturesOptions['fixture'];
  contractRegistry?: ContractAddressRegistry;
  testSpecificMock?: (mockServer: Mockttp) => Promise<void>;
  dapps?: import('../types').DappOptions[];
  enableLocalNode?: boolean;
}

export interface SpeculosTestSuiteParams {
  contractRegistry?: ContractAddressRegistry;
  mockServer: Mockttp;
  localNodes?: LocalNode[];
  commandQueueServer?: CommandQueueServer;
  speculos: SpeculosHelper;
}

export class SpeculosHelper {
  private config: SpeculosConfig;
  private dockerManager: DockerManager | undefined;

  constructor(
    config: Partial<SpeculosConfig> = {},
    dockerManager?: DockerManager,
  ) {
    this.config = { ...DEFAULT_SPECULOS_CONFIG, ...config };
    this.dockerManager = dockerManager;
  }

  get host(): string {
    return this.config.speculosHost;
  }

  get apiPort(): number {
    return this.config.speculosApiPort;
  }

  get controlApiPort(): number {
    return this.config.controlApiPort;
  }

  async isSpeculosReady(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);
      const resp = await fetch(
        `http://${this.config.speculosHost}:${this.config.speculosApiPort}/apdu`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: 'B001000000' }),
          signal: controller.signal,
        },
      );
      clearTimeout(timeout);
      return resp.ok;
    } catch {
      return false;
    }
  }

  async waitForSpeculos(maxRetries = 30, delayMs = 2000): Promise<void> {
    for (let i = 0; i < maxRetries; i++) {
      if (await this.isSpeculosReady()) {
        logger.debug('Speculos is ready');
        return;
      }
      await new Promise((r) => setTimeout(r, delayMs));
    }
    throw new Error(
      `Speculos not ready at ${this.config.speculosHost}:${this.config.speculosApiPort} after ${maxRetries} retries`,
    );
  }

  async isControlApiReady(): Promise<boolean> {
    // Control-API readiness is now owned by SpeculosBleRunner. This thin
    // wrapper is retained for ad-hoc diagnostics (e.g. manual probes of the
    // control port during debugging) and delegates to the same /health check.
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);
      const resp = await fetch(
        `http://${this.config.speculosHost}:${this.config.controlApiPort}/health`,
        { signal: controller.signal },
      );
      clearTimeout(timeout);
      if (!resp.ok) return false;
      const json = (await resp.json()) as { status: string };
      return json.status === 'ready';
    } catch {
      return false;
    }
  }

  async pressButton(
    button: 'left' | 'right' | 'both',
    count = 1,
  ): Promise<void> {
    for (let i = 0; i < count; i++) {
      const resp = await fetch(
        `http://${this.config.speculosHost}:${this.config.speculosApiPort}/button/${button}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'press-and-release' }),
        },
      );
      if (!resp.ok) {
        throw new Error(`Speculos button press failed: HTTP ${resp.status}`);
      }
    }
  }

  async takeScreenshot(): Promise<Uint8Array> {
    const resp = await fetch(
      `http://${this.config.speculosHost}:${this.config.speculosApiPort}/screenshot`,
    );
    if (!resp.ok) {
      throw new Error(`Screenshot failed: HTTP ${resp.status}`);
    }
    const arrayBuffer = await resp.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  }

  async disconnectBle(): Promise<void> {
    try {
      await fetch(
        `http://${this.config.speculosHost}:${this.config.controlApiPort}/ble/disconnect`,
        { method: 'POST' },
      );
    } catch {
      // Best effort
    }
  }

  // Device-interaction helpers below (pressButton / approveTransaction /
  // enableBlindSigning / autoApproveSigning / ...) are kept here rather than
  // migrated to the hw-emulator package's `createDeviceInteraction`/`Speculos`
  // APIs on purpose:
  //  - `enableBlindSigning` is calibrated against the bundled ethereum-nanox.elf
  //    menu structure (main -> menu -> App settings -> Blind signing -> toggle
  //    -> Back -> ready). The package's NanoInteraction.enableBlindSigning uses a
  //    different, incorrect sequence for this ELF.
  //  - approveTransaction/approveSigning are ADAPTIVE: they read the device
  //    screen via the Speculos /events endpoint and navigate right until the
  //    confirm screen appears, then press both. This is robust to blind-signing
  //    on/off and to Ethereum-app review-screen count changes.
  // These methods talk to the Speculos Docker REST API directly.

  /**
   * Read the current Speculos screen text. The `/events` endpoint returns the
   * cumulative draw history as `{"events":[{"text":...}]}`; we take the tail
   * (the most recently drawn lines = the current screen).
   */
  async getScreenText(): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    try {
      const resp = await fetch(
        `http://${this.config.speculosHost}:${this.config.speculosApiPort}/events`,
        { signal: controller.signal },
      );
      const reader = resp.body?.getReader();
      if (!reader) return '';
      let buf = '';
      for (let i = 0; i < 20; i++) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += new TextDecoder().decode(value);
        try {
          const obj = JSON.parse(buf.trim()) as {
            events?: { text?: string }[];
          };
          const texts = (obj.events ?? []).map((e) => e.text ?? '');
          return texts.slice(-6).join(' ').toLowerCase().trim();
        } catch {
          // incomplete JSON — keep reading
        }
        if (buf.length > 65536) break;
      }
      return '';
    } catch {
      return '';
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Navigate right until the current screen matches one of `keywords`, then
   * press both to confirm. Falls back to a both-press after `maxRights`.
   */
  async approveByScreen(keywords: string[], maxRights = 18): Promise<void> {
    for (let i = 0; i < maxRights; i++) {
      const text = await this.getScreenText();
      if (keywords.some((k) => text.includes(k))) {
        await this.pressButton('both');
        await new Promise((r) => setTimeout(r, 600));
        return;
      }
      await this.pressButton('right');
      await new Promise((r) => setTimeout(r, 450));
    }
    logger.debug(
      `approveByScreen: none of [${keywords.join(
        ',',
      )}] found after ${maxRights} rights; pressing both as fallback`,
    );
    await this.pressButton('both');
    await new Promise((r) => setTimeout(r, 600));
  }

  async approveTransaction(): Promise<void> {
    // Ledger Ethereum tx confirm screens (blind-signed or full review).
    await this.approveByScreen([
      'hold to sign',
      'accept',
      'approve',
      'sign transaction',
    ]);
  }

  async approveSigning(): Promise<void> {
    // personal_sign / typed-data confirm screen.
    await this.approveByScreen(['hold to sign', 'accept', 'sign']);
  }

  async rejectTransaction(): Promise<void> {
    await this.pressButton('right');
    await new Promise((r) => setTimeout(r, 300));
    await this.pressButton('both');
  }

  async enableBlindSigning(): Promise<void> {
    // Calibrated against ethereum-nanox.elf via Speculos /events screen mapping.
    // Assumes the app is on the main "Ethereum / app is ready" screen (fresh
    // Docker start with loadNvram resets settings each run).
    // Open menu -> App settings -> (lands on Blind signing) -> toggle -> Back -> ready.
    await this.pressButton('both');
    await new Promise((r) => setTimeout(r, 800));
    await this.pressButton('right'); // -> App settings
    await new Promise((r) => setTimeout(r, 500));
    await this.pressButton('both'); // enter App settings (cursor on Blind signing)
    await new Promise((r) => setTimeout(r, 800));
    await this.pressButton('both'); // toggle Blind signing: Disabled -> Enabled
    await new Promise((r) => setTimeout(r, 800));
    for (let i = 0; i < 6; i++) {
      await this.pressButton('right'); // -> Back
      await new Promise((r) => setTimeout(r, 250));
    }
    await this.pressButton('both'); // Back -> main menu
    await new Promise((r) => setTimeout(r, 700));
    await this.pressButton('left'); // -> ready screen
    await new Promise((r) => setTimeout(r, 300));
    await this.pressButton('left');
    await new Promise((r) => setTimeout(r, 500));
  }

  async autoApproveSigning(
    presses?: { button: string; count: number }[],
  ): Promise<void> {
    if (presses) {
      for (const { button, count } of presses) {
        await this.pressButton(button as 'left' | 'right' | 'both', count);
        await new Promise((r) => setTimeout(r, 500));
      }
    } else {
      await this.approveSigning();
    }
  }

  async reset(): Promise<void> {
    try {
      await this.disconnectBle();
    } catch {
      // Best effort
    }
  }

  async restartDocker(): Promise<void> {
    if (this.dockerManager) {
      logger.debug('Restarting Speculos via DockerManager...');
      await this.dockerManager.stop();
      await this.dockerManager.start();
    } else {
      const containerName = 'metamask-speculos';
      try {
        execSync(`docker restart ${containerName}`, { stdio: 'pipe' });
        logger.debug('Speculos Docker container restarted');
      } catch (e) {
        logger.debug(`Failed to restart Docker: ${(e as Error).message}`);
      }
    }
    await this.waitForSpeculos();
  }
}

function createDockerManager(config: SpeculosConfig): DockerManager {
  const composeFile = join(HW_EMULATOR_DIR, 'docker-compose.yml');
  const elfPath = join(HW_EMULATOR_DIR, 'apps', config.elfFilename);

  return new DockerManager({
    composeFile,
    apduPort: config.speculosApduPort,
    apiPort: config.speculosApiPort,
    app: elfPath,
    model: config.device,
    seed: SPECULOS_MNEMONIC,
    display: 'headless',
    loadNvram: true,
    startTimeout: 180000, // 3 minutes (default 60s is too short when Docker is under load)
  });
}

function cleanupStaleSpeculos(controlApiPort: number): void {
  cleanupStaleSpeculosBle(controlApiPort);
  try {
    execSync(`docker stop metamask-speculos 2>/dev/null || true`, {
      stdio: 'pipe',
    });
    execSync(`docker rm metamask-speculos 2>/dev/null || true`, {
      stdio: 'pipe',
    });
    logger.debug('Cleaned up stale Docker container');
  } catch {
    // No stale container
  }
}

function cleanupStaleSpeculosBle(controlApiPort: number): void {
  try {
    execSync(`pkill -9 -f "speculos_ble" 2>/dev/null || true`, {
      stdio: 'pipe',
    });
    logger.debug('Killed stale speculos-ble processes');
  } catch {
    // No stale processes — expected
  }
  try {
    execSync(
      `lsof -ti :${controlApiPort} | xargs kill -9 2>/dev/null || true`,
      { stdio: 'pipe' },
    );
    logger.debug(`Cleared port ${controlApiPort}`);
  } catch {
    // Port already free
  }
}

export async function withSpeculosFixtures(
  options: WithSpeculosFixturesOptions,
  testSuite: (params: SpeculosTestSuiteParams) => Promise<void>,
): Promise<void> {
  const speculosConfig: SpeculosConfig = {
    ...DEFAULT_SPECULOS_CONFIG,
    ...options.speculos,
  };

  const shouldStartDocker =
    options.startSpeculos !== undefined && options.startSpeculos !== false;

  let dockerManager: DockerManager | undefined;
  let bleRunner: SpeculosBleRunner | undefined;

  try {
    if (shouldStartDocker) {
      cleanupStaleSpeculos(speculosConfig.controlApiPort);
      dockerManager = createDockerManager(speculosConfig);
      logger.debug('Starting Speculos Docker via hw-emulator DockerManager...');
      await dockerManager.start();
      logger.debug('DockerManager reports container healthy');
    }

    const speculos = new SpeculosHelper(speculosConfig, dockerManager);
    await speculos.waitForSpeculos();

    // Kill any stale speculos-ble processes (but NOT Docker — that's running).
    cleanupStaleSpeculosBle(speculosConfig.controlApiPort);

    logger.debug(
      'Starting speculos-ble (SpeculosBleRunner, android-netsim)...',
    );
    bleRunner = new SpeculosBleRunner({
      speculosHost: speculosConfig.speculosHost,
      speculosApduPort: speculosConfig.speculosApduPort,
      speculosApiPort: speculosConfig.speculosApiPort,
      controlApiPort: speculosConfig.controlApiPort,
      deviceName: speculosConfig.deviceName,
      transport: 'android-netsim',
      verbose: true,
      onLog: (line, stream) => logger.debug(`[speculos-ble ${stream}] ${line}`),
    });
    bleRunner.start();

    // Give the process a moment to start before checking readiness.
    await new Promise((r) => setTimeout(r, 1000));

    // Verify the process didn't crash immediately.
    if (!bleRunner.isRunning) {
      throw new Error(
        `speculos-ble process exited immediately. Check port ${speculosConfig.controlApiPort} availability.`,
      );
    }

    await bleRunner.waitForControlApi();

    // Double-check the process is still alive after readiness.
    if (!bleRunner.isRunning) {
      throw new Error('speculos-ble process died after Control API readiness');
    }

    logger.debug(
      'speculos-ble Control API ready — virtual BLE device advertising',
    );

    const withFixturesOptions: WithFixturesOptions = {
      fixture: options.fixture as WithFixturesOptions['fixture'],
      restartDevice: 'newInstance',
      disableSynchronization: true,
      disableLocalNodes: !options.enableLocalNode,
      testSpecificMock: options.testSpecificMock,
      dapps: options.dapps,
    };

    if (options.enableLocalNode) {
      withFixturesOptions.localNodeOptions = [
        {
          type: LocalNodeType.anvil,
          options: {
            mnemonic: SPECULOS_MNEMONIC,
            balance: 1000,
            chainId: 1337,
          },
        },
      ];
    }

    await withFixtures(withFixturesOptions, async (params) => {
      await testSuite({
        ...params,
        speculos,
      });
    });
  } finally {
    if (bleRunner) {
      logger.debug('Stopping speculos-ble runner...');
      await bleRunner.stop();
    }
    if (dockerManager) {
      logger.debug('Stopping Speculos Docker via DockerManager...');
      await dockerManager.stop();
    }
  }
}

/**
 * Login to app when Detox synchronization is disabled.
 *
 * With sync disabled, Detox fires native actions immediately without
 * waiting for the JS thread to idle. This is required for Speculos/BLE
 * tests because the BLE bridge keeps the JS thread permanently busy.
 *
 * The standard loginToApp fails in this mode because its wallet
 * visibility assertion (75% coverage) races the transition animation.
 * This function replaces those assertions with explicit delays and
 * toExist() checks which don't require coverage thresholds.
 */
export async function loginToAppWithSyncDisabled(
  password: string = '123123123',
): Promise<void> {
  // With Detox synchronization disabled, the standard loginToApp can race
  // the wallet transition animation — its toBeVisible() assertion requires
  // 75% screen coverage which may not be met mid-animation.  This variant
  // uses explicit delays and toExist() (no coverage threshold) instead.

  await TestHelpers.delay(3000);

  // Type password using Detox's typeText — with sync disabled this
  // dispatches immediately without waiting for JS thread idle.
  const passwordInput =
    (await LoginView.passwordInput) as Detox.IndexableNativeElement;
  const loginButton =
    (await LoginView.loginButton) as Detox.IndexableNativeElement;

  await waitFor(passwordInput).toExist().withTimeout(60000);
  await passwordInput.typeText(password);
  await TestHelpers.delay(1000);

  // Tap the login button to submit
  await loginButton.tap();
  await TestHelpers.delay(20000);

  // Verify wallet appeared (toExist, not toBeVisible)
  const walletContainer =
    (await WalletView.container) as Detox.IndexableNativeElement;
  await waitFor(walletContainer).toExist().withTimeout(60000);

  // Let the wallet fully render before interacting
  await TestHelpers.delay(5000);
}

export async function importLedgerAccount(): Promise<void> {
  logger.debug('[importLedger] Step 1: waitForAppReady');
  await waitForAppReady(300000);

  logger.debug('[importLedger] Step 2: loginToAppWithSyncDisabled');
  await loginToAppWithSyncDisabled();

  // Temporarily re-enable synchronization for navigation-heavy steps.
  // The JS thread is busy enough to process navigation callbacks but
  // Detox's synchronization requires the JS thread to fully idle.
  // Using a longer timeout gives the thread breathing room.
  logger.debug('[importLedger] Step 3: tapIdenticon');
  await TestHelpers.delay(3000);
  await device.takeScreenshot('03_before_tap_identicon');
  await WalletView.tapIdenticon();
  await TestHelpers.delay(5000);
  await device.takeScreenshot('04_after_tap_identicon');

  logger.debug('[importLedger] Step 4: wait for account list bottom sheet');
  try {
    await Assertions.expectElementToBeVisible(
      AccountListBottomSheet.accountList,
      { timeout: 60000 },
    );
  } catch {
    logger.debug(
      '[importLedger] Step 4: bottom sheet not visible, retrying identicon tap',
    );
    await device.takeScreenshot('04b_bottom_sheet_missing');
    await WalletView.tapIdenticon();
    await TestHelpers.delay(5000);
    await Assertions.expectElementToBeVisible(
      AccountListBottomSheet.accountList,
      { timeout: 60000 },
    );
  }

  logger.debug('[importLedger] Step 5: tapAddAccountButton');
  await AccountListBottomSheet.tapAddAccountButton();
  await TestHelpers.delay(5000);
  await device.takeScreenshot('05_after_add_account');

  logger.debug('[importLedger] Step 6: tapAddHardwareWallet');
  // Wait longer for AddWallet screen to render on debug build
  await TestHelpers.delay(5000);
  await device.takeScreenshot('05b_before_hw_wallet');
  await LedgerConnectView.tapAddHardwareWallet();
  await TestHelpers.delay(3000);
  await device.takeScreenshot('06_after_add_hw');

  logger.debug('[importLedger] Step 7: tapLedgerButton');
  await LedgerConnectView.tapLedgerButton();
  await TestHelpers.delay(3000);
  await device.takeScreenshot('07_after_ledger_btn');

  logger.debug('[importLedger] Step 8: waitForDeviceToAppear');
  await LedgerConnectView.waitForDeviceToAppear(60000);
  await device.takeScreenshot('08_device_appeared');

  logger.debug('[importLedger] Step 9: assertVirtualDeviceVisible');
  await LedgerConnectView.assertVirtualDeviceVisible();

  logger.debug('[importLedger] Step 10: selectVirtualDevice');
  await LedgerConnectView.selectVirtualDevice();
  await TestHelpers.delay(2000);
  await device.takeScreenshot('10_after_select_device');

  logger.debug('[importLedger] Step 11: tapConnect');
  await LedgerConnectView.tapConnect();
  await TestHelpers.delay(5000);
  await device.takeScreenshot('11_after_connect');

  logger.debug('[importLedger] Step 12: waitForNextAccountsButton (120s)');
  await Assertions.expectElementToBeVisible(
    LedgerConnectView.nextAccountsButton,
    { timeout: 120000 },
  );
  await device.takeScreenshot('12_next_accounts_btn');

  logger.debug('[importLedger] Step 13: selectFirstAccount');
  await LedgerConnectView.selectFirstAccount();
  await TestHelpers.delay(2000);
  await device.takeScreenshot('13_after_select_account');

  logger.debug('[importLedger] Step 14: tapUnlockButton');
  await LedgerConnectView.tapUnlockButton();
  await TestHelpers.delay(5000);
  await device.takeScreenshot('14_after_unlock');

  logger.debug('[importLedger] Step 15: returnToWalletHome');
  // After unlock the app is NOT on the wallet home — it's left on the "Accounts"
  // bottom sheet (opened by tapIdenticon in Step 3), covering the bottom tab bar
  // (Explore) so all browser/dapp navigation fails. The Android back button
  // dismisses this sheet → wallet home. IMPORTANT: after a press the dismissed
  // sheet's title lingers in the element tree for a few seconds; re-checking too
  // soon causes a spurious extra press (from the wallet home) that backgrounds
  // the app. So wait generously after each press before re-checking.
  for (let i = 0; i < 3; i++) {
    let sheetOpen = false;
    try {
      const title =
        (await AccountListBottomSheet.title) as Detox.IndexableNativeElement;
      await waitFor(title).toExist().withTimeout(3000);
      sheetOpen = true;
    } catch {
      sheetOpen = false;
    }
    if (!sheetOpen) break;
    logger.debug(
      `[importLedger] Step 15: account sheet open, pressing back to dismiss (${i + 1}/3)`,
    );
    await device.pressBack();
    await TestHelpers.delay(4000); // let the dismissed title leave the tree
  }

  await Assertions.expectElementToBeVisible(WalletView.container, {
    timeout: 30000,
  });
  await device.takeScreenshot('15_wallet_home');

  logger.debug('[importLedger] ✅ Complete');
}
