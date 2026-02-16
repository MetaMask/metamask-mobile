/* eslint-disable import/no-nodejs-modules */
import { spawn, type ChildProcess } from 'child_process';
import net from 'net';
import path from 'path';
import { createWriteStream, existsSync, mkdirSync, type WriteStream } from 'fs';
/* eslint-enable import/no-nodejs-modules */
import type {
  BuildCapability,
  BuildOptions,
  BuildResult,
} from '@metamask/client-mcp-core';
import type {
  WatchModeOptions,
  WatchModeResult,
} from '@metamask/client-mcp-core/dist/capabilities/types.d.mts';

// Prevents arbitrary yarn subcommand execution from LLM input
const ALLOWED_BUILD_TYPES: ReadonlySet<string> = new Set([
  'expo run:ios --no-install',
  'build:ios:main:dev',
]);

interface BuildCommand {
  executable: string;
  args: string[];
}

const DEFAULT_BUILD_COMMAND: BuildCommand = {
  executable: 'yarn',
  args: ['expo', 'run:ios', '--no-install'],
};

export interface MetaMaskMobileBuildCapabilityOptions {
  command?: BuildCommand;
  outputPath?: string;
  timeout?: number;
  simulatorName?: string;
}

export class MetaMaskMobileBuildCapability implements BuildCapability {
  private readonly command: BuildCommand;

  private readonly outputPath: string;

  private readonly timeout: number;

  private readonly simulatorName: string;

  private metroProcess: ChildProcess | null = null;

  private metroPort: number | null = null;

  private logStream: WriteStream | null = null;

  constructor(options: MetaMaskMobileBuildCapabilityOptions = {}) {
    this.command = options.command ?? DEFAULT_BUILD_COMMAND;
    this.outputPath =
      options.outputPath ??
      'ios/build/Build/Products/Debug-iphonesimulator/MetaMask.app';
    this.timeout = options.timeout ?? 600_000;
    this.simulatorName = options.simulatorName ?? 'iPhone 16e';
  }

  async build(options?: BuildOptions): Promise<BuildResult> {
    const startTime = Date.now();

    try {
      const alreadyBuilt = await this.isBuilt();

      if (!options?.force && alreadyBuilt) {
        return {
          success: true,
          extensionPath: this.getExtensionPath(),
          durationMs: Date.now() - startTime,
        };
      }

      const cmd = this.resolveBuildCommand(options?.buildType);
      await this.executeBuild(cmd);

      return {
        success: true,
        extensionPath: this.getExtensionPath(),
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        extensionPath: this.getExtensionPath(),
        durationMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  getExtensionPath(): string {
    return path.join(process.cwd(), this.outputPath);
  }

  async isBuilt(): Promise<boolean> {
    return existsSync(this.getExtensionPath());
  }

  async startWatchMode(options?: WatchModeOptions): Promise<WatchModeResult> {
    if (this.metroProcess) {
      throw new Error(
        'Metro bundler is already running. Call stopWatchMode() first.',
      );
    }

    const port = options?.port ?? 8081;
    const clean = options?.clean ?? false;
    const logFile =
      options?.logFile ??
      path.join(process.cwd(), 'test-artifacts', `metro-${port}.log`);

    const portBusy = await this.isPortInUse(port);
    if (portBusy) {
      console.error(
        `Metro bundler already running on port ${port} — reusing existing instance`,
      );
      this.metroPort = port;
      await this.waitForBundleReady(port);
      return { port, logFile, pid: 0 };
    }

    const args = ['expo', 'start', '--port', String(port)];
    if (clean) {
      args.push('--clear');
    }

    this.metroProcess = spawn('yarn', args, {
      cwd: process.cwd(),
      // MCP servers use stdout for protocol frames — child output must go to stderr only
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: true,
      env: {
        ...process.env,
      },
    });

    mkdirSync(path.dirname(logFile), { recursive: true });
    this.logStream = createWriteStream(logFile, { flags: 'a' });
    this.metroProcess.stdout?.pipe(this.logStream);
    this.metroProcess.stdout?.pipe(process.stderr);
    this.metroProcess.stderr?.pipe(this.logStream);
    this.metroProcess.stderr?.pipe(process.stderr);

    this.metroProcess.on('close', (code) => {
      if (this.metroProcess) {
        console.error(`Metro bundler exited unexpectedly with code ${code}`);
        this.metroProcess = null;
      }
    });

    await this.waitForMetroReady(this.metroProcess);

    const pid = this.metroProcess?.pid;
    if (!pid) {
      throw new Error('Metro bundler process exited or failed to start');
    }

    this.metroPort = port;

    await this.waitForBundleReady(port);

    return { port, logFile, pid };
  }

  async stopWatchMode(): Promise<void> {
    if (!this.metroProcess) {
      return;
    }

    const proc = this.metroProcess;
    this.metroProcess = null;
    this.metroPort = null;

    if (proc.pid) {
      try {
        process.kill(-proc.pid, 'SIGTERM');
      } catch {
        try {
          proc.kill('SIGTERM');
        } catch {
          // Process may already be dead
        }
      }
    }

    // Wait for process to actually release the port before returning
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(resolve, 5_000);
      proc.on('close', () => {
        clearTimeout(timeout);
        resolve();
      });
    });

    this.logStream?.end();
    this.logStream = null;
  }

  isWatching(): boolean {
    return this.metroProcess !== null;
  }

  getMetroPort(): number | null {
    return this.metroPort;
  }

  private resolveBuildCommand(buildType?: string): BuildCommand {
    if (!buildType) {
      return this.command;
    }

    if (!ALLOWED_BUILD_TYPES.has(buildType)) {
      throw new Error(
        `Build type "${buildType}" is not allowed. ` +
          `Permitted values: ${[...ALLOWED_BUILD_TYPES].join(', ')}`,
      );
    }

    return { executable: 'yarn', args: buildType.split(' ') };
  }

  private executeBuild(cmd: BuildCommand): Promise<void> {
    return new Promise((resolve, reject) => {
      let settled = false;
      const settle = (fn: () => void) => {
        if (!settled) {
          settled = true;
          fn();
        }
      };

      const buildProcess = spawn(cmd.executable, cmd.args, {
        cwd: process.cwd(),
        // MCP servers use stdout for protocol frames — child output must go to stderr only
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: true,
        env: {
          ...process.env,
          IOS_SIMULATOR: this.simulatorName,
        },
      });

      buildProcess.stdout?.pipe(process.stderr);
      buildProcess.stderr?.pipe(process.stderr);

      const timeoutId = setTimeout(() => {
        if (buildProcess.pid) {
          try {
            process.kill(-buildProcess.pid, 'SIGKILL');
          } catch {
            buildProcess.kill('SIGKILL');
          }
        } else {
          buildProcess.kill('SIGKILL');
        }
        settle(() =>
          reject(new Error(`Build timed out after ${this.timeout}ms`)),
        );
      }, this.timeout);

      buildProcess.on('close', (code) => {
        clearTimeout(timeoutId);
        settle(() => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`Build process exited with code ${code}`));
          }
        });
      });

      buildProcess.on('error', (error) => {
        clearTimeout(timeoutId);
        settle(() => reject(error));
      });
    });
  }

  private isPortInUse(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      socket.once('connect', () => {
        socket.destroy();
        resolve(true);
      });
      socket.once('error', () => {
        socket.destroy();
        resolve(false);
      });
      socket.connect(port, '127.0.0.1');
    });
  }

  private async waitForBundleReady(port: number): Promise<void> {
    const BUNDLE_READY_TIMEOUT_MS = 180_000;
    const POLL_INTERVAL_MS = 3_000;
    const startTime = Date.now();
    const bundleUrl = `http://localhost:${port}/index.bundle?platform=ios&dev=true&minify=false&lazy=true`;

    console.error('Waiting for Metro to finish compiling the bundle...');

    while (Date.now() - startTime < BUNDLE_READY_TIMEOUT_MS) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10_000);
        const response = await fetch(bundleUrl, {
          method: 'HEAD',
          signal: controller.signal,
        }).finally(() => clearTimeout(timeoutId));

        if (response.ok) {
          console.error('Metro bundle is ready');
          return;
        }
      } catch {
        // Metro still compiling or not reachable yet
      }
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }

    throw new Error(
      `Metro bundle did not become ready within ${BUNDLE_READY_TIMEOUT_MS}ms`,
    );
  }

  private waitForMetroReady(proc: ChildProcess): Promise<void> {
    const READY_TIMEOUT_MS = 120_000;

    return new Promise((resolve, reject) => {
      let settled = false;
      const settle = (fn: () => void) => {
        if (!settled) {
          settled = true;
          fn();
        }
      };

      const timer = setTimeout(() => {
        settle(() =>
          reject(
            new Error(
              `Metro bundler did not become ready within ${READY_TIMEOUT_MS}ms`,
            ),
          ),
        );
      }, READY_TIMEOUT_MS);

      const onData = (chunk: Buffer) => {
        const text = chunk.toString();
        if (
          text.includes('Logs for your project') ||
          text.includes('Metro waiting on') ||
          text.includes('› Using Expo Go') ||
          text.includes('› Press')
        ) {
          clearTimeout(timer);
          proc.stdout?.off('data', onData);
          proc.stderr?.off('data', onData);
          settle(() => resolve());
        }
      };

      proc.stdout?.on('data', onData);
      proc.stderr?.on('data', onData);

      proc.on('close', (code) => {
        clearTimeout(timer);
        settle(() =>
          reject(
            new Error(
              `Metro bundler exited with code ${code} before becoming ready`,
            ),
          ),
        );
      });

      proc.on('error', (error) => {
        clearTimeout(timer);
        settle(() => reject(error));
      });
    });
  }
}
