#!/usr/bin/env node

import { Command } from 'commander';
import { join, resolve } from 'path';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { resolveConfig } from '../src/config';
import { startRepl } from '../src/repl';
import { AdbBridge } from '../src/adb-bridge';
import { AiClient } from '../src/ai-client';
import { ApkManager } from '../src/apk-manager';
import { FlowPlayer } from '../src/flow-player';
import { BaselineManager } from '../src/baseline-manager';
import { METAMASK_PACKAGE_ID } from '../src/config';

const program = new Command();

program
  .name('mm-visual-test')
  .description('AI-powered visual testing CLI for MetaMask mobile')
  .version('0.1.0');

function addGlobalOptions(cmd: Command): Command {
  return cmd
    .option(
      '--endpoint <url>',
      'LiteLLM API endpoint',
      'https://litellm.consensys.info',
    )
    .option('--model <name>', 'Model name', 'gemma4')
    .option('--device <serial>', 'ADB device serial')
    .option('--live-view', 'Launch live view web UI', false)
    .option('--output-dir <path>', 'Output directory', './visual-test-results')
    .option('--verbose', 'Show full AI responses', false)
    .option('--apk <path>', 'APK to install before starting')
    .option('--api-key <key>', 'LiteLLM API key (or set LITELLM_API_KEY)');
}

// --- repl ---
addGlobalOptions(
  program
    .command('repl')
    .description('Interactive AI-driven navigation mode')
    .requiredOption('--goal <text>', 'What the AI should test/explore'),
).action(async (opts) => {
  const config = resolveConfig({
    endpoint: opts.endpoint,
    model: opts.model,
    device: opts.device ?? null,
    liveView: opts.liveView,
    outputDir: resolve(opts.outputDir),
    verbose: opts.verbose,
    apk: opts.apk ?? null,
    apiKey: opts.apiKey ?? null,
  });
  await startRepl(opts.goal, config);
});

// --- run ---
addGlobalOptions(
  program
    .command('run <flow-file>')
    .description('Replay a recorded flow and evaluate for regressions'),
).action(async (flowFile: string, opts) => {
  const config = resolveConfig({
    endpoint: opts.endpoint,
    model: opts.model,
    device: opts.device ?? null,
    liveView: opts.liveView,
    outputDir: resolve(opts.outputDir),
    verbose: opts.verbose,
    apk: opts.apk ?? null,
    apiKey: opts.apiKey ?? null,
  });

  const adb = new AdbBridge(config.device ?? undefined);
  const devices = await adb.listDevices();
  if (devices.length === 0) {
    console.error('No ADB devices found.');
    process.exit(1);
  }
  const serial = config.device ?? devices[0];
  const adbWithDevice = new AdbBridge(serial);

  const flow = FlowPlayer.loadFlow(flowFile);
  const screenSize = await adbWithDevice.getScreenSize();
  const ai = new AiClient(config.endpoint, config.model, config.apiKey);
  const player = new FlowPlayer(adbWithDevice, ai, screenSize);

  const baselineMgr = new BaselineManager(join(config.outputDir, 'baselines'));
  const flowSlug = flow.name.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase();
  const baselineDir = baselineMgr.hasBaseline(flowSlug)
    ? baselineMgr.getBaselineDir(flowSlug)
    : null;

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const screenshotDir = join(
    config.outputDir,
    `run-${timestamp}`,
    'screenshots',
  );

  console.log(`\nRunning: ${flow.name} (${flow.steps.length} steps)`);

  const report = await player.playFlow(
    flow,
    screenshotDir,
    baselineDir,
    (stepId, total, evaluation) => {
      const icon =
        evaluation.verdict === 'pass'
          ? 'PASS'
          : evaluation.verdict === 'warning'
            ? 'WARN'
            : 'FAIL';
      const pad = '.'.repeat(Math.max(1, 30 - evaluation.summary.length));
      console.log(`[${stepId}/${total}] ${evaluation.summary} ${pad} ${icon}`);
    },
  );

  console.log(
    `\nResults: ${report.summary.pass} pass, ${report.summary.warning} warning, ${report.summary.regression} regression`,
  );
});

// --- upgrade ---
addGlobalOptions(
  program
    .command('upgrade')
    .description('Test APK upgrade flow')
    .requiredOption('--from <path>', 'Base APK to install first')
    .requiredOption('--to <path>', 'APK to upgrade to')
    .option('--setup-flow <path>', 'Flow to replay after installing base APK')
    .option('--goal <text>', 'AI goal for post-upgrade exploration'),
).action(async (opts) => {
  const config = resolveConfig({
    endpoint: opts.endpoint,
    model: opts.model,
    device: opts.device ?? null,
    liveView: opts.liveView,
    outputDir: resolve(opts.outputDir),
    verbose: opts.verbose,
    apk: null,
    apiKey: opts.apiKey ?? null,
  });

  const adb = new AdbBridge(config.device ?? undefined);
  const devices = await adb.listDevices();
  if (devices.length === 0) {
    console.error('No ADB devices found.');
    process.exit(1);
  }
  const serial = config.device ?? devices[0];
  const adbWithDevice = new AdbBridge(serial);
  const apkMgr = new ApkManager(serial);

  console.log('Uninstalling existing MetaMask...');
  await apkMgr.uninstallApp(METAMASK_PACKAGE_ID);

  console.log(`Installing base APK: ${opts.from}`);
  await apkMgr.installApk(opts.from);

  if (opts.setupFlow) {
    console.log(`Running setup flow: ${opts.setupFlow}`);
    const flow = FlowPlayer.loadFlow(opts.setupFlow);
    const screenSize = await adbWithDevice.getScreenSize();
    const ai = new AiClient(config.endpoint, config.model, config.apiKey);
    const player = new FlowPlayer(adbWithDevice, ai, screenSize);
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, '-')
      .slice(0, 19);
    const screenshotDir = join(
      config.outputDir,
      `upgrade-setup-${timestamp}`,
      'screenshots',
    );
    await player.playFlow(flow, screenshotDir, null, (stepId, total) => {
      console.log(`  Setup step ${stepId}/${total}`);
    });
    console.log('Setup flow complete.');
  }

  console.log(`\nUpgrading to: ${opts.to}`);
  await apkMgr.upgradeApk(opts.to);

  console.log('Launching upgraded app...');
  await adbWithDevice.launchApp(METAMASK_PACKAGE_ID);
  await new Promise((r) => setTimeout(r, 5000));

  if (opts.goal) {
    console.log(`\nStarting post-upgrade exploration: "${opts.goal}"`);
    await startRepl(opts.goal, config);
  } else {
    console.log(
      '\nUpgrade complete. Use --goal to run post-upgrade AI exploration.',
    );
  }
});

// --- baseline ---
const baseline = program
  .command('baseline')
  .description('Manage golden baselines');

addGlobalOptions(
  baseline
    .command('save <flow-file>')
    .description('Run a flow and save screenshots as baselines'),
).action(async (flowFile: string, opts) => {
  const config = resolveConfig({
    endpoint: opts.endpoint,
    model: opts.model,
    device: opts.device ?? null,
    liveView: false,
    outputDir: resolve(opts.outputDir),
    verbose: opts.verbose,
    apk: null,
    apiKey: opts.apiKey ?? null,
  });

  const adb = new AdbBridge(config.device ?? undefined);
  const devices = await adb.listDevices();
  if (devices.length === 0) {
    console.error('No ADB devices found.');
    process.exit(1);
  }
  const serial = config.device ?? devices[0];
  const adbWithDevice = new AdbBridge(serial);

  const flow = FlowPlayer.loadFlow(flowFile);
  const screenSize = await adbWithDevice.getScreenSize();
  const ai = new AiClient(config.endpoint, config.model, config.apiKey);
  const player = new FlowPlayer(adbWithDevice, ai, screenSize);
  const baselineMgr = new BaselineManager(join(config.outputDir, 'baselines'));
  const flowSlug = flow.name.replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase();

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const screenshotDir = join(
    config.outputDir,
    `baseline-${timestamp}`,
    'screenshots',
  );

  console.log(`\nSaving baselines for: ${flow.name}`);

  for (const step of flow.steps) {
    await player.executeAction(step.action, flow.device.screen);
    await new Promise((r) => setTimeout(r, 500));
    const screenshotPath = join(
      screenshotDir,
      `${String(step.id).padStart(3, '0')}.png`,
    );
    await adbWithDevice.takeScreenshot(screenshotPath);
    const buf = readFileSync(screenshotPath);
    baselineMgr.saveStep(flowSlug, step.id, buf, step.ai_observation);
    console.log(`  [${step.id}/${flow.steps.length}] Saved`);
  }

  baselineMgr.saveMetadata(flowSlug, flow.steps.length);
  console.log(`\nBaselines saved for "${flow.name}"`);
});

baseline
  .command('list')
  .description('List all saved baselines')
  .option('--output-dir <path>', 'Output directory', './visual-test-results')
  .action((opts) => {
    const baselineMgr = new BaselineManager(
      join(resolve(opts.outputDir), 'baselines'),
    );
    const list = baselineMgr.listBaselines();
    if (list.length === 0) {
      console.log('No baselines saved.');
    } else {
      console.log('Saved baselines:');
      list.forEach((name) => console.log(`  - ${name}`));
    }
  });

baseline
  .command('delete <name>')
  .description('Delete a saved baseline')
  .option('--output-dir <path>', 'Output directory', './visual-test-results')
  .action((name: string, opts) => {
    const baselineMgr = new BaselineManager(
      join(resolve(opts.outputDir), 'baselines'),
    );
    baselineMgr.deleteBaseline(name);
    console.log(`Deleted baseline: ${name}`);
  });

// --- flows ---
program
  .command('flows')
  .description('List recorded flows')
  .option('--output-dir <path>', 'Output directory', './visual-test-results')
  .action((opts) => {
    const flowsDir = join(resolve(opts.outputDir), 'flows');
    if (!existsSync(flowsDir)) {
      console.log('No flows recorded yet.');
      return;
    }
    const files = readdirSync(flowsDir).filter((f: string) =>
      f.endsWith('.yaml'),
    );
    if (files.length === 0) {
      console.log('No flows recorded yet.');
    } else {
      console.log('Recorded flows:');
      files.forEach((f: string) => console.log(`  - ${f}`));
    }
  });

// --- devices ---
program
  .command('devices')
  .description('List connected ADB devices')
  .action(async () => {
    const adb = new AdbBridge();
    const devices = await adb.listDevices();
    if (devices.length === 0) {
      console.log('No devices connected.');
    } else {
      console.log('Connected devices:');
      for (const serial of devices) {
        const d = new AdbBridge(serial);
        const model = await d.getDeviceModel();
        console.log(`  - ${serial} (${model})`);
      }
    }
  });

program.parse();
