import { execFile as execFileCb } from 'child_process';
import { writeFile, mkdir } from 'fs/promises';
import { dirname } from 'path';

function exec(cmd: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFileCb(
      cmd,
      args,
      { maxBuffer: 50 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          reject(
            new Error(
              `adb command failed: ${cmd} ${args.join(' ')}\n${stderr || error.message}`,
            ),
          );
          return;
        }
        resolve(stdout);
      },
    );
  });
}

function execBuffer(cmd: string, args: string[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    execFileCb(
      cmd,
      args,
      { maxBuffer: 50 * 1024 * 1024, encoding: 'buffer' },
      (error, stdout, stderr) => {
        if (error) {
          reject(
            new Error(
              `adb command failed: ${cmd} ${args.join(' ')}\n${String(stderr) || error.message}`,
            ),
          );
          return;
        }
        resolve(stdout as unknown as Buffer);
      },
    );
  });
}

export class AdbBridge {
  private deviceFlag: string[];

  constructor(deviceSerial?: string) {
    this.deviceFlag = deviceSerial ? ['-s', deviceSerial] : [];
  }

  private adb(args: string[]): Promise<string> {
    return exec('adb', [...this.deviceFlag, ...args]);
  }

  private adbBuffer(args: string[]): Promise<Buffer> {
    return execBuffer('adb', [...this.deviceFlag, ...args]);
  }

  async listDevices(): Promise<string[]> {
    const output = await exec('adb', ['devices']);
    return output
      .split('\n')
      .slice(1)
      .map((line) => line.trim())
      .filter((line) => line.endsWith('\tdevice'))
      .map((line) => line.split('\t')[0]);
  }

  async getScreenSize(): Promise<[number, number]> {
    const output = await this.adb(['shell', 'wm', 'size']);
    const match = output.match(/(\d+)x(\d+)/);
    if (!match) throw new Error(`Failed to parse screen size: ${output}`);
    return [parseInt(match[1], 10), parseInt(match[2], 10)];
  }

  async getDeviceModel(): Promise<string> {
    const output = await this.adb(['shell', 'getprop', 'ro.product.model']);
    return output.trim();
  }

  async takeScreenshot(savePath: string): Promise<string> {
    await mkdir(dirname(savePath), { recursive: true });
    const buffer = await this.adbBuffer(['exec-out', 'screencap', '-p']);
    await writeFile(savePath, buffer);
    return savePath;
  }

  async tap(x: number, y: number): Promise<void> {
    await this.adb(['shell', 'input', 'tap', String(x), String(y)]);
  }

  async swipe(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    durationMs = 300,
  ): Promise<void> {
    await this.adb([
      'shell',
      'input',
      'swipe',
      String(x1),
      String(y1),
      String(x2),
      String(y2),
      String(durationMs),
    ]);
  }

  async typeText(text: string): Promise<void> {
    const escaped = text.replace(/ /g, '%s');
    await this.adb(['shell', 'input', 'text', escaped]);
  }

  async pressBack(): Promise<void> {
    await this.adb(['shell', 'input', 'keyevent', 'KEYCODE_BACK']);
  }

  async pressHome(): Promise<void> {
    await this.adb(['shell', 'input', 'keyevent', 'KEYCODE_HOME']);
  }

  async launchApp(packageId: string): Promise<void> {
    await this.adb([
      'shell',
      'monkey',
      '-p',
      packageId,
      '-c',
      'android.intent.category.LAUNCHER',
      '1',
    ]);
  }

  async forceStopApp(packageId: string): Promise<void> {
    await this.adb(['shell', 'am', 'force-stop', packageId]);
  }
}
