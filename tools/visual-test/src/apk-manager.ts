import { execFile as execFileCb } from 'child_process';
import { existsSync } from 'fs';

function exec(cmd: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFileCb(
      cmd,
      args,
      { maxBuffer: 10 * 1024 * 1024, timeout: 120_000 },
      (error, stdout, stderr) => {
        if (error) {
          reject(
            new Error(
              `Command failed: ${cmd} ${args.join(' ')}\n${stderr || error.message}`,
            ),
          );
          return;
        }
        resolve(stdout);
      },
    );
  });
}

export class ApkManager {
  private deviceFlag: string[];

  constructor(deviceSerial?: string) {
    this.deviceFlag = deviceSerial ? ['-s', deviceSerial] : [];
  }

  private adb(args: string[]): Promise<string> {
    return exec('adb', [...this.deviceFlag, ...args]);
  }

  async installApk(apkPath: string): Promise<void> {
    if (!existsSync(apkPath)) {
      throw new Error(`APK file not found: ${apkPath}`);
    }
    await this.adb(['install', apkPath]);
  }

  async upgradeApk(apkPath: string): Promise<void> {
    if (!existsSync(apkPath)) {
      throw new Error(`APK file not found: ${apkPath}`);
    }
    await this.adb(['install', '-r', apkPath]);
  }

  async uninstallApp(packageId: string): Promise<void> {
    try {
      await this.adb(['uninstall', packageId]);
    } catch {
      // App may not be installed
    }
  }

  async isAppInstalled(packageId: string): Promise<boolean> {
    const output = await this.adb([
      'shell',
      'pm',
      'list',
      'packages',
      packageId,
    ]);
    return output.includes(`package:${packageId}`);
  }

  async getInstalledVersion(packageId: string): Promise<string> {
    const output = await this.adb(['shell', 'dumpsys', 'package', packageId]);
    const match = output.match(/versionName=(\S+)/);
    if (!match) throw new Error(`Could not determine version for ${packageId}`);
    return match[1];
  }
}
