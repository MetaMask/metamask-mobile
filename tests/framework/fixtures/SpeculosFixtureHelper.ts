/* eslint-disable import-x/no-nodejs-modules */
import { execSync, spawn, type ChildProcess } from 'child_process';
import { resolve, join } from 'path';
import { withFixtures } from './FixtureHelper';
import {
  type WithFixturesOptions,
  type LocalNode,
  LocalNodeType,
} from '../types';
import TestHelpers from '../../helpers';
import { loginToApp } from '../../flows/wallet.flow';
import { waitForAppReady } from '../../flows/general.flow';
import WalletView from '../../page-objects/wallet/WalletView';
import AccountListBottomSheet from '../../page-objects/wallet/AccountListBottomSheet';
import LedgerConnectView from '../../page-objects/Ledger/LedgerConnectView';
import Assertions from '../Assertions';
import { createLogger } from '../logger';
import type ContractAddressRegistry from '../../../app/util/test/contract-address-registry';
import type { Mockttp } from 'mockttp';
import type CommandQueueServer from './CommandQueueServer';
import {
  DockerManager,
  SPECULOS_SEED as HW_EMULATOR_SEED,
  SPECULOS_LEDGER_ADDRESS as HW_EMULATOR_LEDGER_ADDRESS,
} from '@metamask-previews/hw-emulator';

const logger = createLogger({ name: 'SpeculosFixtureHelper' });

const SPECULOS_BLE_DIR = resolve(__dirname, '../../../packages/speculos-ble');

const HW_EMULATOR_DIR = resolve(
  __dirname,
  '../../../node_modules/@metamask-previews/hw-emulator',
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

  async waitForControlApi(maxRetries = 30, delayMs = 2000): Promise<void> {
    for (let i = 0; i < maxRetries; i++) {
      if (await this.isControlApiReady()) {
        logger.debug('Control API is ready');
        return;
      }
      await new Promise((r) => setTimeout(r, delayMs));
    }
    throw new Error(
      `Control API not ready at ${this.config.speculosHost}:${this.config.controlApiPort} after ${maxRetries} retries`,
    );
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

  async approveTransaction(): Promise<void> {
    for (let i = 0; i < 6; i++) {
      await this.pressButton('right');
      await new Promise((r) => setTimeout(r, 500));
    }
    await this.pressButton('both');
    await new Promise((r) => setTimeout(r, 500));
  }

  async approveSigning(): Promise<void> {
    for (let i = 0; i < 2; i++) {
      await this.pressButton('right');
      await new Promise((r) => setTimeout(r, 500));
    }
    await this.pressButton('both');
    await new Promise((r) => setTimeout(r, 500));
  }

  async rejectTransaction(): Promise<void> {
    await this.pressButton('right');
    await new Promise((r) => setTimeout(r, 300));
    await this.pressButton('both');
  }

  async enableBlindSigning(): Promise<void> {
    await this.pressButton('both');
    await new Promise((r) => setTimeout(r, 800));
    await this.pressButton('right');
    await new Promise((r) => setTimeout(r, 400));
    await this.pressButton('both');
    await new Promise((r) => setTimeout(r, 800));
    await this.pressButton('both');
    await new Promise((r) => setTimeout(r, 800));
    for (let i = 0; i < 6; i++) {
      await this.pressButton('right');
      await new Promise((r) => setTimeout(r, 200));
    }
    await this.pressButton('both');
    await new Promise((r) => setTimeout(r, 500));
    await this.pressButton('left');
    await new Promise((r) => setTimeout(r, 400));
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
      await this.pressButton('right', 4);
      await new Promise((r) => setTimeout(r, 500));
      await this.pressButton('both');
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

function startSpeculosBleService(config: SpeculosConfig): ChildProcess {
  const venvPython = join(SPECULOS_BLE_DIR, '.venv', 'bin', 'python');

  const args = [
    '-m',
    'speculos_ble',
    '--transport',
    'android-netsim',
    '--device-name',
    config.deviceName,
    '--speculos-host',
    config.speculosHost,
    '--speculos-apdu-port',
    String(config.speculosApduPort),
    '--speculos-api-port',
    String(config.speculosApiPort),
    '--control-api-port',
    String(config.controlApiPort),
    '-v',
  ];

  logger.debug(`Starting speculos-ble: ${venvPython} ${args.join(' ')}`);

  const child = spawn(venvPython, args, {
    cwd: SPECULOS_BLE_DIR,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      VIRTUAL_ENV: join(SPECULOS_BLE_DIR, '.venv'),
    },
  });

  child.stdout?.on('data', (data: Buffer) => {
    logger.debug(`[speculos-ble stdout] ${data.toString().trim()}`);
  });

  child.stderr?.on('data', (data: Buffer) => {
    logger.debug(`[speculos-ble stderr] ${data.toString().trim()}`);
  });

  child.on('error', (err) => {
    logger.error(`speculos-ble process error: ${err.message}`);
  });

  child.on('exit', (code, signal) => {
    logger.debug(`speculos-ble exited with code=${code} signal=${signal}`);
  });

  return child;
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
  });
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
  let bleProcess: ChildProcess | undefined;

  try {
    if (shouldStartDocker) {
      dockerManager = createDockerManager(speculosConfig);
      logger.debug('Starting Speculos Docker via hw-emulator DockerManager...');
      await dockerManager.start();
      logger.debug('DockerManager reports container healthy');
    }

    const speculos = new SpeculosHelper(speculosConfig, dockerManager);
    await speculos.waitForSpeculos();

    logger.debug('Starting speculos-ble with android-netsim transport...');
    bleProcess = startSpeculosBleService(speculosConfig);

    await speculos.waitForControlApi();
    logger.debug(
      'speculos-ble Control API ready — virtual BLE device advertising',
    );

    const withFixturesOptions: WithFixturesOptions = {
      fixture: options.fixture as WithFixturesOptions['fixture'],
      restartDevice: true,
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
    if (bleProcess) {
      logger.debug('Stopping speculos-ble process...');
      bleProcess.kill('SIGTERM');
      try {
        await new Promise<void>((res) => {
          const proc = bleProcess as ChildProcess;
          proc.once('exit', () => res());
          setTimeout(() => {
            proc.kill('SIGKILL');
            res();
          }, 5000);
        });
      } catch {
        // Best effort
      }
    }
    if (dockerManager) {
      logger.debug('Stopping Speculos Docker via DockerManager...');
      await dockerManager.stop();
    }
  }
}

export async function importLedgerAccount(): Promise<void> {
  await TestHelpers.delay(5000);
  await waitForAppReady(300000);
  await loginToApp();
  await TestHelpers.delay(5000);
  await WalletView.tapIdenticon();
  await TestHelpers.delay(8000);
  await AccountListBottomSheet.tapAddAccountButton();
  await TestHelpers.delay(5000);
  await LedgerConnectView.tapAddHardwareWallet();
  await TestHelpers.delay(3000);
  await LedgerConnectView.tapLedgerButton();
  await TestHelpers.delay(5000);
  await LedgerConnectView.waitForDeviceToAppear(60000);
  await LedgerConnectView.assertVirtualDeviceVisible();
  await LedgerConnectView.selectVirtualDevice();
  await TestHelpers.delay(2000);
  await LedgerConnectView.tapConnect();
  await TestHelpers.delay(10000);
  await Assertions.expectElementToBeVisible(
    LedgerConnectView.nextAccountsButton,
    { timeout: 60000 },
  );

  // Select the first discovered account and unlock it
  await LedgerConnectView.selectFirstAccount();
  await TestHelpers.delay(2000);
  await LedgerConnectView.tapUnlockButton();
  await TestHelpers.delay(5000);

  // Now wait for the wallet view to be visible
  await Assertions.expectElementToBeVisible(WalletView.container, {
    timeout: 30000,
  });
}
