/* eslint-disable import-x/no-nodejs-modules */
import { execSync, spawn, type ChildProcess } from 'child_process';
import { resolve, join, dirname, basename } from 'path';
import { withFixtures } from './FixtureHelper';
import type { WithFixturesOptions, LocalNode } from '../types';
import { createLogger } from '../logger';
import type ContractAddressRegistry from '../../../app/util/test/contract-address-registry';
import type { Mockttp } from 'mockttp';
import type CommandQueueServer from './CommandQueueServer';
import {
  SpeculosManager,
  type SpeculosManagerOptions,
} from '../../seeder/speculos-manager';

const logger = createLogger({ name: 'SpeculosFixtureHelper' });

const SPECULOS_BLE_DIR = resolve(__dirname, '../../../packages/speculos-ble');

const PROJECT_ROOT = resolve(__dirname, '../../..');

const SPECULOS_ELF_DIR = resolve(PROJECT_ROOT, '.speculos-cache/apps');

export interface SpeculosConfig {
  speculosHost: string;
  speculosApiPort: number;
  speculosApduPort: number;
  controlApiPort: number;
  deviceName: string;
}

const DEFAULT_SPECULOS_CONFIG: SpeculosConfig = {
  speculosHost: '127.0.0.1',
  speculosApiPort: 5100,
  speculosApduPort: 10099,
  controlApiPort: 5002,
  deviceName: 'Ledger Nano X',
};

export interface WithSpeculosFixturesOptions {
  speculos?: Partial<SpeculosConfig>;
  startSpeculos?: boolean | SpeculosManagerOptions;
  fixture?: Record<string, unknown>;
  contractRegistry?: ContractAddressRegistry;
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

  constructor(config: Partial<SpeculosConfig> = {}) {
    this.config = { ...DEFAULT_SPECULOS_CONFIG, ...config };
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
    if (await this.isControlApiReady()) {
      await this.pressButtonViaControlApi(button, count);
    } else {
      await this.pressButtonViaSpeculosApi(button, count);
    }
  }

  async pressButtonViaSpeculosApi(
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

  async pressButtonViaControlApi(
    button: 'left' | 'right' | 'both',
    count = 1,
  ): Promise<void> {
    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const resp = await fetch(
          `http://${this.config.speculosHost}:${this.config.controlApiPort}/button/press`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ button, count }),
          },
        );
        if (!resp.ok) {
          const body = await resp.text();
          if (attempt < maxRetries) {
            await new Promise((r) => setTimeout(r, 1000));
            continue;
          }
          throw new Error(
            `Control API button press failed: HTTP ${resp.status} - ${body}`,
          );
        }
        return;
      } catch (e) {
        if (attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, 1000));
          continue;
        }
        throw e;
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

  async autoApprove(): Promise<void> {
    for (let i = 0; i < 4; i++) {
      await this.pressButton('right', 1);
      await new Promise((r) => setTimeout(r, 300));
    }
    await new Promise((r) => setTimeout(r, 500));
    await this.pressButton('both', 1);
  }

  async reset(): Promise<void> {
    try {
      await this.disconnectBle();
    } catch {
      // Best effort
    }
  }
}

function startSpeculosBleService(config: SpeculosConfig): ChildProcess {
  const venvPython = join(SPECULOS_BLE_DIR, '.venv', 'bin', 'python');
  const venvBin = join(SPECULOS_BLE_DIR, '.venv', 'bin', 'speculos-ble');

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

async function ensureSpeculosDocker(config: SpeculosConfig): Promise<void> {
  const containerName = 'speculos-ledger';

  if (
    execSync(`docker ps --filter name=${containerName} -q`, {
      encoding: 'utf-8',
    }).trim()
  ) {
    logger.debug('Speculos Docker already running');
    return;
  }

  const existingContainer = execSync(
    `docker ps -a --filter name=${containerName} -q`,
    { encoding: 'utf-8' },
  ).trim();
  if (existingContainer) {
    execSync(`docker rm -f ${containerName}`, { stdio: 'ignore' });
  }

  const elfPath = join(SPECULOS_ELF_DIR, 'ethereum-nanox.elf');
  const elfDir = dirname(elfPath);
  const elfName = basename(elfPath);

  logger.debug(
    `Starting Speculos Docker on API:${config.speculosApiPort} APDU:${config.speculosApduPort}...`,
  );
  execSync(
    `docker run -d --name ${containerName} ` +
      `-p ${config.speculosApduPort}:9998 ` +
      `-p ${config.speculosApiPort}:5000 ` +
      `-v ${elfDir}:/apps:ro ` +
      `ghcr.io/ledgerhq/speculos ` +
      `--model nanox --display headless ` +
      `--apdu-port 9998 ` +
      `/apps/${elfName}`,
    { stdio: 'pipe' },
  );
}

async function killSpeculosDocker(): Promise<void> {
  try {
    execSync('docker stop speculos-ledger', { stdio: 'ignore' });
    execSync('docker rm speculos-ledger', { stdio: 'ignore' });
  } catch {
    // Best effort
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

  const speculosManager =
    options.startSpeculos !== undefined && options.startSpeculos !== false
      ? new SpeculosManager(
          typeof options.startSpeculos === 'object'
            ? options.startSpeculos
            : {},
        )
      : undefined;

  let bleProcess: ChildProcess | undefined;

  try {
    if (speculosManager) {
      await ensureSpeculosDocker(speculosConfig);
    }

    const speculos = new SpeculosHelper(speculosConfig);
    await speculos.waitForSpeculos();

    logger.debug('Starting speculos-ble with android-netsim transport...');
    bleProcess = startSpeculosBleService(speculosConfig);

    await speculos.waitForControlApi();
    logger.debug(
      'speculos-ble Control API ready — virtual BLE device advertising',
    );

    await withFixtures(
      {
        fixture: options.fixture as WithFixturesOptions['fixture'],
        restartDevice: true,
        disableSynchronization: true,
        disableLocalNodes: true,
      },
      async (params) => {
        await testSuite({
          ...params,
          speculos,
        });
      },
    );
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
    if (speculosManager) {
      await killSpeculosDocker();
      await speculosManager.stop();
    }
  }
}
