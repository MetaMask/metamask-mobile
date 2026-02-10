/* eslint-disable import/no-nodejs-modules */
import { spawn } from 'child_process';
import path from 'path';
import { existsSync } from 'fs';
/* eslint-enable import/no-nodejs-modules */
import type {
  BuildCapability,
  BuildOptions,
  BuildResult,
} from '@metamask/client-mcp-core';

export interface MetaMaskMobileBuildCapabilityOptions {
  command?: string;
  outputPath?: string;
  timeout?: number;
  simulatorName?: string;
}

export class MetaMaskMobileBuildCapability implements BuildCapability {
  private readonly command: string;

  private readonly outputPath: string;

  private readonly timeout: number;

  private readonly simulatorName: string;

  constructor(options: MetaMaskMobileBuildCapabilityOptions = {}) {
    this.command = options.command ?? 'yarn expo run:ios --no-install';
    this.outputPath =
      options.outputPath ??
      'ios/build/Build/Products/Debug-iphonesimulator/MetaMask.app';
    this.timeout = options.timeout ?? 600000; // 10 minutes default
    this.simulatorName = options.simulatorName ?? 'iPhone 16';
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

      // Determine build command
      const buildCommand = options?.buildType
        ? `yarn ${options.buildType}`
        : this.command;

      // Parse command into executable and args
      const [executable, ...args] = buildCommand.split(' ');

      // Execute build command using spawn
      await this.executeBuild(executable, args);

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
    const appPath = this.getExtensionPath();
    return existsSync(appPath);
  }

  private executeBuild(executable: string, args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const buildProcess = spawn(executable, args, {
        cwd: process.cwd(),
        stdio: 'inherit',
        env: {
          ...process.env,
          IOS_SIMULATOR: this.simulatorName,
        },
      });

      // Set timeout
      const timeoutId = setTimeout(() => {
        buildProcess.kill();
        reject(new Error(`Build timed out after ${this.timeout}ms`));
      }, this.timeout);

      buildProcess.on('close', (code) => {
        clearTimeout(timeoutId);
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Build process exited with code ${code}`));
        }
      });

      buildProcess.on('error', (error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
    });
  }
}
