import * as readline from 'readline';
import { join } from 'path';
import { AdbBridge } from './adb-bridge';
import { AiClient } from './ai-client';
import { AiNavigator } from './ai-navigator';
import { ApkManager } from './apk-manager';
import { LiveViewServer } from './live-view';
import {
  VisualTestConfig,
  DeviceInfo,
  AiNavigationResponse,
  LiveViewEvent,
} from './types';
import { METAMASK_PACKAGE_ID } from './config';

function formatAction(action: {
  type: string;
  target?: string;
  coords?: number[];
  text?: string;
}): string {
  switch (action.type) {
    case 'tap':
      return `TAP "${action.target}" @ (${(action as any).coords.join(', ')})`;
    case 'swipe':
      return 'SWIPE';
    case 'type':
      return `TYPE "${action.text}"`;
    case 'back':
      return 'BACK';
    case 'home':
      return 'HOME';
    case 'wait':
      return 'WAIT';
    case 'launch_app':
      return 'LAUNCH APP';
    default:
      return action.type.toUpperCase();
  }
}

export async function startRepl(
  goal: string,
  config: VisualTestConfig,
): Promise<void> {
  const adb = new AdbBridge(config.device ?? undefined);

  const devices = await adb.listDevices();
  if (devices.length === 0) {
    console.error('No ADB devices found. Connect a device and try again.');
    process.exit(1);
  }
  const serial = config.device ?? devices[0];

  const adbWithDevice = new AdbBridge(serial);
  const [model, screenSize] = await Promise.all([
    adbWithDevice.getDeviceModel(),
    adbWithDevice.getScreenSize(),
  ]);
  const device: DeviceInfo = { serial, model, screen: screenSize };

  console.log(`\nConnected to device: ${model} (adb:${serial})`);
  console.log(`Model: ${config.model} via ${config.endpoint}`);

  if (config.apk) {
    console.log(`\nInstalling APK: ${config.apk}`);
    const apkMgr = new ApkManager(serial);
    await apkMgr.installApk(config.apk);
    console.log('APK installed. Launching...');
    await adbWithDevice.launchApp(METAMASK_PACKAGE_ID);
    await new Promise((r) => setTimeout(r, 3000));
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const screenshotDir = join(
    config.outputDir,
    `repl-${timestamp}`,
    'screenshots',
  );

  const ai = new AiClient(config.endpoint, config.model, config.apiKey);
  const navigator = new AiNavigator(
    adbWithDevice,
    ai,
    device,
    goal,
    screenshotDir,
  );

  let liveView: LiveViewServer | null = null;
  if (config.liveView) {
    liveView = new LiveViewServer();
    const url = liveView.start();
    console.log(`Live view: ${url}`);
  }

  const history: Array<{ step: number; summary: string }> = [];

  const navPromise = navigator.run({
    onStep(
      stepNum: number,
      response: AiNavigationResponse,
      screenshotPath: string,
    ) {
      const actionStr = formatAction(response.action);
      console.log(`\n[${stepNum}] Screenshot captured`);
      console.log(`[${stepNum}] AI: "${response.observation}"`);
      console.log(`[${stepNum}] ${actionStr}`);

      if (response.issue) {
        console.log(`[${stepNum}] !! Issue: ${response.issue}`);
      }

      history.push({ step: stepNum, summary: response.observation });

      if (liveView) {
        const event: LiveViewEvent = {
          type: 'step',
          stepNumber: stepNum,
          screenshotPath,
          observation: response.observation,
          action: actionStr,
          history,
        };
        liveView.sendEvent(event);
      }
    },
    onDone(totalSteps: number) {
      console.log(`\nFlow completed after ${totalSteps} steps.`);
    },
    onError(error: Error) {
      console.error(`\nError: ${error.message}`);
    },
  });

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.setPrompt('> ');

  rl.on('line', async (line: string) => {
    const input = line.trim();
    if (!input) return;

    const [cmd, ...args] = input.split(' ');

    switch (cmd) {
      case 'pause':
        navigator.pause();
        console.log('Paused. Type "resume" to continue.');
        if (liveView) {
          liveView.sendEvent({
            type: 'status',
            stepNumber: 0,
            screenshotPath: '',
            observation: 'Paused',
            action: '',
            history,
          });
        }
        break;
      case 'resume':
        navigator.resume();
        console.log('Resumed.');
        if (liveView) {
          liveView.sendEvent({
            type: 'status',
            stepNumber: 0,
            screenshotPath: '',
            observation: 'Running',
            action: '',
            history,
          });
        }
        break;
      case 'undo':
        await adbWithDevice.pressBack();
        console.log('Sent BACK key.');
        break;
      case 'tap':
        if (args.length >= 2) {
          const x = parseInt(args[0], 10);
          const y = parseInt(args[1], 10);
          await adbWithDevice.tap(x, y);
          console.log(`Manual TAP (${x}, ${y})`);
        } else {
          console.log('Usage: tap <x> <y>');
        }
        break;
      case 'note':
        if (args.length > 0) {
          navigator.addNote(args.join(' '));
          console.log('Note added to next step.');
        } else {
          console.log('Usage: note <text>');
        }
        break;
      case 'quit':
        navigator.stop();
        break;
      default:
        console.log(
          'Commands: pause, resume, screenshot, undo, tap <x> <y>, note <text>, quit',
        );
    }
  });

  await navPromise;

  const recorder = navigator.getRecorder();
  if (recorder.stepCount() > 0) {
    const flowName = goal
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .toLowerCase()
      .slice(0, 50);
    const flowPath = join(
      config.outputDir,
      'flows',
      `${flowName}-${timestamp}.yaml`,
    );
    recorder.save(flowPath);
    console.log(`\nFlow saved: ${flowPath}`);
  }

  liveView?.stop();
  rl.close();
}
