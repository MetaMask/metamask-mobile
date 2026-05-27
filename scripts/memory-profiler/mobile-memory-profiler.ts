#!/usr/bin/env node
/* eslint-disable import-x/no-nodejs-modules */

import { execFile, type ChildProcess } from 'child_process';
import path from 'path';
import { promises as fs } from 'fs';

const DEFAULT_ARTIFACT_DIR = 'test-artifacts/mobile-memory';
const DEFAULT_ANDROID_APP_ID = 'io.metamask';
const DEFAULT_ANDROID_ACTIVITY = 'io.metamask.MainActivity';
const DEFAULT_IOS_APP_ID = 'io.metamask.MetaMask';
const DEFAULT_IOS_PROCESS_NAME = 'MetaMask';
const DEFAULT_ITERATIONS = 5;
const DEFAULT_WAIT_AFTER_FLOW_MS = 1000;
const DEFAULT_SEND_RECIPIENT_ADDRESS =
  '0x0000000000000000000000000000000000000001';
const DEFAULT_SEND_AMOUNT = '25%';
const DEFAULT_APPIUM_URL = 'http://127.0.0.1:4723/';
const DEFAULT_APPIUM_STARTUP_TIMEOUT_MS = 60_000;
const DEFAULT_APPIUM_ELEMENT_TIMEOUT_MS = 20_000;
const COMMAND_MAX_BUFFER = 50 * 1024 * 1024;

export type MobileMemoryPlatform = 'android' | 'ios';
export type MobileMemoryFlow =
  | 'idle'
  | 'relaunch'
  | 'wallet-send-eth-cancel'
  | 'wallet-send-eth-submit';
export type MobileMemorySampleMode = 'each' | 'final';

export interface MobileMemoryProfilerOptions {
  platform: MobileMemoryPlatform;
  appId: string;
  androidActivity: string;
  iosProcessName: string;
  deviceId?: string;
  iterations: number;
  flow: MobileMemoryFlow;
  artifactDir: string;
  outputPath: string;
  sampleMode: MobileMemorySampleMode;
  launch: boolean;
  enableInAppProfiler: boolean;
  waitAfterFlowMs: number;
  intervalMs: number;
  recipientAddress: string;
  sendAmount: string;
  appiumUrl: string;
  reuseAppium: boolean;
  appiumStartupTimeoutMs: number;
  appiumElementTimeoutMs: number;
  allowTransactionSubmit: boolean;
  pullHermesProfile: boolean;
  hermesProfilePath?: string;
  sourcemapPath?: string;
  maxRssGrowthBytes?: number;
  maxPssGrowthBytes?: number;
  maxNativeHeapGrowthBytes?: number;
  maxJavaHeapGrowthBytes?: number;
  help: boolean;
}

export interface MobileMemoryMetrics {
  rssBytes: number | null;
  pssBytes: number | null;
  nativeHeapBytes: number | null;
  javaHeapBytes: number | null;
  graphicsBytes: number | null;
  codeBytes: number | null;
  stackBytes: number | null;
  privateOtherBytes: number | null;
  systemBytes: number | null;
  swapPssBytes: number | null;
  virtualSizeBytes: number | null;
}

export interface MobileMemorySample {
  label: string;
  timestamp: string;
  platform: MobileMemoryPlatform;
  appId: string;
  deviceId: string | null;
  processId: number | null;
  memory: MobileMemoryMetrics;
}

export interface MobileMemoryDeltaSummary {
  rssBytes: number | null;
  pssBytes: number | null;
  nativeHeapBytes: number | null;
  javaHeapBytes: number | null;
  virtualSizeBytes: number | null;
}

export interface MobileMemoryThresholdEvaluation {
  name: 'rssBytes' | 'pssBytes' | 'nativeHeapBytes' | 'javaHeapBytes';
  limit: number;
  actual: number | null;
  unit: 'bytes';
  passed: boolean;
}

export interface HermesProfileCliResult {
  command: string;
  cwd: string;
  stdout: string;
  stderr: string;
}

export interface MobileMemoryReport {
  schemaVersion: 1;
  createdAt: string;
  options: Omit<MobileMemoryProfilerOptions, 'help'>;
  target: {
    platform: MobileMemoryPlatform;
    appId: string;
    deviceId: string | null;
  };
  samples: MobileMemorySample[];
  hermesProfileCliResult: HermesProfileCliResult | null;
  summary: {
    baseline: MobileMemorySample | null;
    final: MobileMemorySample | null;
    deltas: MobileMemoryDeltaSummary;
    thresholds: MobileMemoryThresholdEvaluation[];
  };
}

export interface CommandResult {
  stdout: string;
  stderr: string;
}

export type CommandRunner = (
  command: string,
  args: string[],
  options?: { cwd?: string },
) => Promise<CommandResult>;

interface AppiumDriver {
  $(selector: string): AppiumElement;
  back(): Promise<void>;
  deleteSession(): Promise<void>;
  hideKeyboard(): Promise<void>;
}

interface AppiumElement {
  click(): Promise<void>;
  isDisplayed(): Promise<boolean>;
  setValue(value: string): Promise<void>;
  waitForDisplayed(options?: { timeout?: number }): Promise<boolean>;
  waitForEnabled(options?: { timeout?: number }): Promise<boolean>;
}

interface AppiumRuntime {
  driver?: AppiumDriver;
  serverProcess?: ChildProcess;
}

interface AppiumEndpoint {
  protocol: 'http' | 'https';
  hostname: string;
  port: number;
  path: string;
}

const VALID_PLATFORMS: MobileMemoryPlatform[] = ['android', 'ios'];
const VALID_FLOWS: MobileMemoryFlow[] = [
  'idle',
  'relaunch',
  'wallet-send-eth-cancel',
  'wallet-send-eth-submit',
];
const VALID_SAMPLE_MODES: MobileMemorySampleMode[] = ['each', 'final'];
const PERCENTAGE_AMOUNTS = new Set(['25', '50', '75', '100']);
const WALLET_SEND_BUTTON_ID = 'wallet-send-button';
const RECIPIENT_ADDRESS_INPUT_ID = 'recipient-address-input';
const REVIEW_BUTTON_ID = 'review-button';
const CONFIRM_BUTTON_ID = 'confirm-button';
const CANCEL_BUTTON_ID = 'cancel-button';

const emptyMemoryMetrics = (): MobileMemoryMetrics => ({
  rssBytes: null,
  pssBytes: null,
  nativeHeapBytes: null,
  javaHeapBytes: null,
  graphicsBytes: null,
  codeBytes: null,
  stackBytes: null,
  privateOtherBytes: null,
  systemBytes: null,
  swapPssBytes: null,
  virtualSizeBytes: null,
});

export function parseMobileMemoryProfilerArgs(
  argv: string[],
): MobileMemoryProfilerOptions {
  const mutableOptions: Partial<MobileMemoryProfilerOptions> = {
    platform: 'android',
    androidActivity: DEFAULT_ANDROID_ACTIVITY,
    iosProcessName: DEFAULT_IOS_PROCESS_NAME,
    iterations: DEFAULT_ITERATIONS,
    flow: 'relaunch',
    artifactDir: DEFAULT_ARTIFACT_DIR,
    outputPath: '',
    sampleMode: 'each',
    launch: true,
    enableInAppProfiler: false,
    waitAfterFlowMs: DEFAULT_WAIT_AFTER_FLOW_MS,
    intervalMs: 0,
    recipientAddress: DEFAULT_SEND_RECIPIENT_ADDRESS,
    sendAmount: DEFAULT_SEND_AMOUNT,
    appiumUrl: DEFAULT_APPIUM_URL,
    reuseAppium: false,
    appiumStartupTimeoutMs: DEFAULT_APPIUM_STARTUP_TIMEOUT_MS,
    appiumElementTimeoutMs: DEFAULT_APPIUM_ELEMENT_TIMEOUT_MS,
    allowTransactionSubmit: false,
    pullHermesProfile: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    switch (arg) {
      case '--':
        break;
      case '--help':
      case '-h':
        mutableOptions.help = true;
        break;
      case '--platform':
        mutableOptions.platform = parseChoice(
          readArgValue(argv, (index += 1), arg),
          VALID_PLATFORMS,
          arg,
        );
        break;
      case '--app-id':
        mutableOptions.appId = readArgValue(argv, (index += 1), arg);
        break;
      case '--activity':
      case '--android-activity':
        mutableOptions.androidActivity = readArgValue(
          argv,
          (index += 1),
          arg,
        );
        break;
      case '--ios-process-name':
        mutableOptions.iosProcessName = readArgValue(
          argv,
          (index += 1),
          arg,
        );
        break;
      case '--device':
      case '--device-id':
      case '--udid':
        mutableOptions.deviceId = readArgValue(argv, (index += 1), arg);
        break;
      case '--iterations':
        mutableOptions.iterations = parsePositiveInteger(
          readArgValue(argv, (index += 1), arg),
          arg,
        );
        break;
      case '--flow':
        mutableOptions.flow = parseChoice(
          readArgValue(argv, (index += 1), arg),
          VALID_FLOWS,
          arg,
        );
        break;
      case '--artifact-dir':
        mutableOptions.artifactDir = readArgValue(argv, (index += 1), arg);
        break;
      case '--output':
        mutableOptions.outputPath = readArgValue(argv, (index += 1), arg);
        break;
      case '--sample':
      case '--sample-mode':
        mutableOptions.sampleMode = parseChoice(
          readArgValue(argv, (index += 1), arg),
          VALID_SAMPLE_MODES,
          arg,
        );
        break;
      case '--launch':
        mutableOptions.launch = true;
        break;
      case '--no-launch':
        mutableOptions.launch = false;
        break;
      case '--enable-in-app-profiler':
        mutableOptions.enableInAppProfiler = true;
        break;
      case '--wait-after-flow':
        mutableOptions.waitAfterFlowMs = parseNonNegativeInteger(
          readArgValue(argv, (index += 1), arg),
          arg,
        );
        break;
      case '--interval':
        mutableOptions.intervalMs = parseNonNegativeInteger(
          readArgValue(argv, (index += 1), arg),
          arg,
        );
        break;
      case '--recipient':
      case '--recipient-address':
        mutableOptions.recipientAddress = readArgValue(argv, (index += 1), arg);
        break;
      case '--send-amount':
        mutableOptions.sendAmount = readArgValue(argv, (index += 1), arg);
        break;
      case '--appium-url':
        mutableOptions.appiumUrl = readArgValue(argv, (index += 1), arg);
        break;
      case '--reuse-appium':
        mutableOptions.reuseAppium = true;
        break;
      case '--appium-startup-timeout':
        mutableOptions.appiumStartupTimeoutMs = parseNonNegativeInteger(
          readArgValue(argv, (index += 1), arg),
          arg,
        );
        break;
      case '--appium-element-timeout':
        mutableOptions.appiumElementTimeoutMs = parseNonNegativeInteger(
          readArgValue(argv, (index += 1), arg),
          arg,
        );
        break;
      case '--allow-transaction-submit':
        mutableOptions.allowTransactionSubmit = true;
        break;
      case '--pull-hermes-profile':
        mutableOptions.pullHermesProfile = true;
        break;
      case '--hermes-profile':
        mutableOptions.hermesProfilePath = path.resolve(
          readArgValue(argv, (index += 1), arg),
        );
        break;
      case '--sourcemap-path':
        mutableOptions.sourcemapPath = path.resolve(
          readArgValue(argv, (index += 1), arg),
        );
        break;
      case '--max-rss-growth':
        mutableOptions.maxRssGrowthBytes = parseByteSize(
          readArgValue(argv, (index += 1), arg),
          arg,
        );
        break;
      case '--max-pss-growth':
        mutableOptions.maxPssGrowthBytes = parseByteSize(
          readArgValue(argv, (index += 1), arg),
          arg,
        );
        break;
      case '--max-native-heap-growth':
        mutableOptions.maxNativeHeapGrowthBytes = parseByteSize(
          readArgValue(argv, (index += 1), arg),
          arg,
        );
        break;
      case '--max-java-heap-growth':
        mutableOptions.maxJavaHeapGrowthBytes = parseByteSize(
          readArgValue(argv, (index += 1), arg),
          arg,
        );
        break;
      default:
        throw new Error(`Unknown option: ${arg}`);
    }
  }

  const platform = mutableOptions.platform ?? 'android';
  const artifactDir = resolveOutputPath(
    mutableOptions.artifactDir ?? DEFAULT_ARTIFACT_DIR,
  );
  const appId =
    mutableOptions.appId ??
    (platform === 'android' ? DEFAULT_ANDROID_APP_ID : DEFAULT_IOS_APP_ID);

  return {
    platform,
    appId,
    androidActivity:
      mutableOptions.androidActivity ?? DEFAULT_ANDROID_ACTIVITY,
    iosProcessName:
      mutableOptions.iosProcessName ?? DEFAULT_IOS_PROCESS_NAME,
    deviceId: mutableOptions.deviceId,
    iterations: mutableOptions.iterations ?? DEFAULT_ITERATIONS,
    flow: mutableOptions.flow ?? 'relaunch',
    artifactDir,
    outputPath: mutableOptions.outputPath
      ? resolveOutputPath(mutableOptions.outputPath)
      : createDefaultOutputPath(artifactDir, platform),
    sampleMode: mutableOptions.sampleMode ?? 'each',
    launch: mutableOptions.launch ?? true,
    enableInAppProfiler: mutableOptions.enableInAppProfiler ?? false,
    waitAfterFlowMs:
      mutableOptions.waitAfterFlowMs ?? DEFAULT_WAIT_AFTER_FLOW_MS,
    intervalMs: mutableOptions.intervalMs ?? 0,
    recipientAddress:
      mutableOptions.recipientAddress ?? DEFAULT_SEND_RECIPIENT_ADDRESS,
    sendAmount: mutableOptions.sendAmount ?? DEFAULT_SEND_AMOUNT,
    appiumUrl: mutableOptions.appiumUrl ?? DEFAULT_APPIUM_URL,
    reuseAppium: mutableOptions.reuseAppium ?? false,
    appiumStartupTimeoutMs:
      mutableOptions.appiumStartupTimeoutMs ??
      DEFAULT_APPIUM_STARTUP_TIMEOUT_MS,
    appiumElementTimeoutMs:
      mutableOptions.appiumElementTimeoutMs ??
      DEFAULT_APPIUM_ELEMENT_TIMEOUT_MS,
    allowTransactionSubmit: mutableOptions.allowTransactionSubmit ?? false,
    pullHermesProfile: mutableOptions.pullHermesProfile ?? false,
    hermesProfilePath: mutableOptions.hermesProfilePath,
    sourcemapPath: mutableOptions.sourcemapPath,
    maxRssGrowthBytes: mutableOptions.maxRssGrowthBytes,
    maxPssGrowthBytes: mutableOptions.maxPssGrowthBytes,
    maxNativeHeapGrowthBytes: mutableOptions.maxNativeHeapGrowthBytes,
    maxJavaHeapGrowthBytes: mutableOptions.maxJavaHeapGrowthBytes,
    help: mutableOptions.help ?? false,
  };
}

export function parseByteSize(value: string, optionName = 'value'): number {
  const match = value
    .trim()
    .match(/^(\d+(?:\.\d+)?)\s*(b|kb|kib|mb|mib|gb|gib)?$/iu);

  if (!match) {
    throw new Error(
      `${optionName} must be a byte size such as 5000000, 25mb, or 25MiB`,
    );
  }

  const amount = Number(match[1]);
  const unit = match[2]?.toLowerCase() ?? 'b';
  const multiplier =
    {
      b: 1,
      kb: 1000,
      kib: 1024,
      mb: 1000 * 1000,
      mib: 1024 * 1024,
      gb: 1000 * 1000 * 1000,
      gib: 1024 * 1024 * 1024,
    }[unit] ?? 1;

  return Math.round(amount * multiplier);
}

export function parseAndroidMeminfo(
  meminfoOutput: string,
): MobileMemoryMetrics {
  const metrics = emptyMemoryMetrics();
  metrics.pssBytes = parseKbMatch(meminfoOutput, /TOTAL\s+PSS:\s+([\d,]+)/iu);
  metrics.rssBytes = parseKbMatch(meminfoOutput, /TOTAL\s+RSS:\s+([\d,]+)/iu);
  metrics.swapPssBytes = parseKbMatch(
    meminfoOutput,
    /TOTAL\s+SWAP\s+PSS:\s+([\d,]+)/iu,
  );

  for (const rawLine of meminfoOutput.split(/\r?\n/u)) {
    const line = rawLine.trim();
    const match = line.match(
      /^(Java Heap|Native Heap|Code|Stack|Graphics|Private Other|System):\s+([\d,]+)(?:\s+([\d,]+))?/iu,
    );

    if (!match) {
      continue;
    }

    const label = match[1].toLowerCase();
    const pssBytes = kbStringToBytes(match[2]);
    const rssBytes = match[3] ? kbStringToBytes(match[3]) : null;

    switch (label) {
      case 'java heap':
        metrics.javaHeapBytes = pssBytes;
        break;
      case 'native heap':
        metrics.nativeHeapBytes = pssBytes;
        break;
      case 'code':
        metrics.codeBytes = pssBytes;
        break;
      case 'stack':
        metrics.stackBytes = pssBytes;
        break;
      case 'graphics':
        metrics.graphicsBytes = pssBytes;
        break;
      case 'private other':
        metrics.privateOtherBytes = pssBytes;
        break;
      case 'system':
        metrics.systemBytes = pssBytes;
        break;
      default:
        break;
    }

    if (label === 'native heap' && metrics.rssBytes === null) {
      metrics.rssBytes = rssBytes;
    }
  }

  return metrics;
}

export function parseIosPsOutput(
  psOutput: string,
  processName: string,
): { pid: number; memory: MobileMemoryMetrics } | null {
  const candidates = psOutput
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .map((line) => {
      const match = line.match(/^(\d+)\s+(\d+)\s+(\d+)\s+(.+)$/u);
      if (!match) {
        return null;
      }
      return {
        pid: Number(match[1]),
        rssBytes: kbStringToBytes(match[2]),
        virtualSizeBytes: kbStringToBytes(match[3]),
        command: match[4],
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
    .filter((entry) => {
      const commandBaseName = path.basename(entry.command);
      return (
        commandBaseName === processName ||
        entry.command.includes(`/${processName}.app/`) ||
        entry.command.includes(processName)
      );
    });

  const selected = candidates[0];
  if (!selected) {
    return null;
  }

  return {
    pid: selected.pid,
    memory: {
      ...emptyMemoryMetrics(),
      rssBytes: selected.rssBytes,
      virtualSizeBytes: selected.virtualSizeBytes,
    },
  };
}

export function calculateDeltas(
  baseline: MobileMemorySample | null,
  final: MobileMemorySample | null,
): MobileMemoryDeltaSummary {
  return {
    rssBytes: delta(baseline?.memory.rssBytes, final?.memory.rssBytes),
    pssBytes: delta(baseline?.memory.pssBytes, final?.memory.pssBytes),
    nativeHeapBytes: delta(
      baseline?.memory.nativeHeapBytes,
      final?.memory.nativeHeapBytes,
    ),
    javaHeapBytes: delta(
      baseline?.memory.javaHeapBytes,
      final?.memory.javaHeapBytes,
    ),
    virtualSizeBytes: delta(
      baseline?.memory.virtualSizeBytes,
      final?.memory.virtualSizeBytes,
    ),
  };
}

export function evaluateThresholds(
  options: Pick<
    MobileMemoryProfilerOptions,
    | 'maxRssGrowthBytes'
    | 'maxPssGrowthBytes'
    | 'maxNativeHeapGrowthBytes'
    | 'maxJavaHeapGrowthBytes'
  >,
  deltas: MobileMemoryDeltaSummary,
): MobileMemoryThresholdEvaluation[] {
  const thresholds: MobileMemoryThresholdEvaluation[] = [];

  if (options.maxRssGrowthBytes !== undefined) {
    thresholds.push(
      createThresholdEvaluation({
        name: 'rssBytes',
        limit: options.maxRssGrowthBytes,
        actual: deltas.rssBytes,
      }),
    );
  }

  if (options.maxPssGrowthBytes !== undefined) {
    thresholds.push(
      createThresholdEvaluation({
        name: 'pssBytes',
        limit: options.maxPssGrowthBytes,
        actual: deltas.pssBytes,
      }),
    );
  }

  if (options.maxNativeHeapGrowthBytes !== undefined) {
    thresholds.push(
      createThresholdEvaluation({
        name: 'nativeHeapBytes',
        limit: options.maxNativeHeapGrowthBytes,
        actual: deltas.nativeHeapBytes,
      }),
    );
  }

  if (options.maxJavaHeapGrowthBytes !== undefined) {
    thresholds.push(
      createThresholdEvaluation({
        name: 'javaHeapBytes',
        limit: options.maxJavaHeapGrowthBytes,
        actual: deltas.javaHeapBytes,
      }),
    );
  }

  return thresholds;
}

export function createMobileMemoryReport({
  createdAt,
  options,
  samples,
  hermesProfileCliResult,
}: {
  createdAt: string;
  options: MobileMemoryProfilerOptions;
  samples: MobileMemorySample[];
  hermesProfileCliResult: HermesProfileCliResult | null;
}): MobileMemoryReport {
  const baseline = samples[0] ?? null;
  const final = samples[samples.length - 1] ?? null;
  const deltas = calculateDeltas(baseline, final);
  const { help: _help, ...serializedOptions } = options;

  return {
    schemaVersion: 1,
    createdAt,
    options: serializedOptions,
    target: {
      platform: options.platform,
      appId: options.appId,
      deviceId: options.deviceId ?? null,
    },
    samples,
    hermesProfileCliResult,
    summary: {
      baseline,
      final,
      deltas,
      thresholds: evaluateThresholds(options, deltas),
    },
  };
}

export async function runMobileMemoryProfiler(
  options: MobileMemoryProfilerOptions,
  runner: CommandRunner = runCommand,
): Promise<MobileMemoryReport> {
  const samples: MobileMemorySample[] = [];
  const runtime: AppiumRuntime = {};

  try {
    await fs.mkdir(options.artifactDir, { recursive: true });

    if (options.launch) {
      await launchApp(options, runner);
      await sleep(options.waitAfterFlowMs);
    }

    samples.push(await collectMemorySample(options, 'baseline', runner));

    for (let iteration = 1; iteration <= options.iterations; iteration += 1) {
      await runFlowIteration(options, runner, runtime);

      if (options.sampleMode === 'each') {
        samples.push(
          await collectMemorySample(options, `iteration-${iteration}`, runner),
        );
      }

      if (options.intervalMs > 0 && iteration < options.iterations) {
        await sleep(options.intervalMs);
      }
    }

    if (options.sampleMode === 'final') {
      samples.push(await collectMemorySample(options, 'final', runner));
    }

    const hermesProfileCliResult = await maybeRunHermesProfileCli(
      options,
      runner,
    );
    const report = createMobileMemoryReport({
      createdAt: new Date().toISOString(),
      options,
      samples,
      hermesProfileCliResult,
    });

    await fs.mkdir(path.dirname(options.outputPath), { recursive: true });
    await fs.writeFile(
      options.outputPath,
      `${JSON.stringify(report, null, 2)}\n`,
    );

    return report;
  } finally {
    await cleanupAppiumRuntime(runtime);
  }
}

export function formatBytes(value: number | null): string {
  if (value === null) {
    return 'n/a';
  }

  return `${(value / (1024 * 1024)).toFixed(2)} MiB`;
}

export function getHelpText(): string {
  return `Usage: yarn llm:mobile:memory -- [options]

Collect native process memory telemetry for MetaMask Mobile leak investigation.

Options:
  --platform <name>             android, ios. Default: android
  --app-id <id>                 Android package or iOS bundle id.
                                Defaults: ${DEFAULT_ANDROID_APP_ID} / ${DEFAULT_IOS_APP_ID}
  --activity <name>             Android launchable activity. Default: ${DEFAULT_ANDROID_ACTIVITY}
  --ios-process-name <name>     iOS simulator process name. Default: ${DEFAULT_IOS_PROCESS_NAME}
  --device <id>                 adb serial or simctl device id. Default: adb default / booted sim
  --iterations <n>              Number of flow iterations. Default: ${DEFAULT_ITERATIONS}
  --flow <name>                 idle, relaunch, wallet-send-eth-cancel,
                                wallet-send-eth-submit. Default: relaunch
  --artifact-dir <path>         Artifact directory. Default: ${DEFAULT_ARTIFACT_DIR}
  --output <path>               JSON report path
  --sample <mode>               each, final. Default: each
  --launch / --no-launch        Launch app before baseline. Default: launch
  --enable-in-app-profiler      Pass enableProfiler=true when launching the app
  --wait-after-flow <ms>        Delay after app launch/flow step. Default: ${DEFAULT_WAIT_AFTER_FLOW_MS}
  --interval <ms>               Delay between iterations. Default: 0
  --recipient-address <addr>    Recipient for wallet-send-eth-* flows.
                                Default: ${DEFAULT_SEND_RECIPIENT_ADDRESS}
  --send-amount <value>         Amount for wallet-send-eth-* flows.
                                Supports keypad values like 0.001 or percentages
                                25%, 50%, 75%, 100%, max. Default: ${DEFAULT_SEND_AMOUNT}
  --appium-url <url>            WebDriver endpoint for Appium flows.
                                Default: ${DEFAULT_APPIUM_URL}
  --reuse-appium                Connect to an already-running Appium server
  --appium-startup-timeout <ms> Appium startup timeout. Default: ${DEFAULT_APPIUM_STARTUP_TIMEOUT_MS}
  --appium-element-timeout <ms> Appium element wait timeout. Default: ${DEFAULT_APPIUM_ELEMENT_TIMEOUT_MS}
  --allow-transaction-submit    Required with --flow wallet-send-eth-submit
  --pull-hermes-profile         Run yarn react-native-release-profiler --fromDownload
                                after the memory run. Android only.
  --hermes-profile <path>       Convert a local .cpuprofile with react-native-release-profiler
  --sourcemap-path <path>       Sourcemap path passed to react-native-release-profiler
  --max-rss-growth <size>       Fail if RSS grows above size
  --max-pss-growth <size>       Fail if Android PSS grows above size
  --max-native-heap-growth <size>
                                Fail if Android native heap PSS grows above size
  --max-java-heap-growth <size> Fail if Android Java heap PSS grows above size
  --help                        Show this help text

Examples:
  yarn llm:mobile:memory -- --platform android --iterations 25 --max-pss-growth 40MiB
  yarn llm:mobile:memory -- --platform ios --flow relaunch --sample final --device booted
  yarn llm:mobile:memory -- --platform android --pull-hermes-profile --sourcemap-path ./sourcemaps
  yarn llm:mobile:memory -- --flow wallet-send-eth-cancel --iterations 10
`;
}

async function main(): Promise<void> {
  const options = parseMobileMemoryProfilerArgs(process.argv.slice(2));

  if (options.help) {
    console.log(getHelpText());
    return;
  }

  const report = await runMobileMemoryProfiler(options);
  const failedThresholds = report.summary.thresholds.filter(
    (threshold) => !threshold.passed,
  );

  console.log(`Mobile memory report: ${options.outputPath}`);
  console.log(`RSS delta: ${formatBytes(report.summary.deltas.rssBytes)}`);
  console.log(`PSS delta: ${formatBytes(report.summary.deltas.pssBytes)}`);
  console.log(
    `Native heap delta: ${formatBytes(report.summary.deltas.nativeHeapBytes)}`,
  );
  console.log(
    `Java heap delta: ${formatBytes(report.summary.deltas.javaHeapBytes)}`,
  );
  console.log(
    `Virtual size delta: ${formatBytes(
      report.summary.deltas.virtualSizeBytes,
    )}`,
  );

  if (report.hermesProfileCliResult) {
    console.log(
      `Hermes profile CLI output directory: ${report.hermesProfileCliResult.cwd}`,
    );
  }

  if (failedThresholds.length > 0) {
    for (const threshold of failedThresholds) {
      console.error(
        `Memory threshold failed: ${threshold.name} grew by ${formatBytes(
          threshold.actual,
        )}, limit ${formatBytes(threshold.limit)}`,
      );
    }
    process.exitCode = 1;
  }
}

async function collectMemorySample(
  options: MobileMemoryProfilerOptions,
  label: string,
  runner: CommandRunner,
): Promise<MobileMemorySample> {
  const result =
    options.platform === 'android'
      ? await collectAndroidMemorySample(options, runner)
      : await collectIosMemorySample(options, runner);

  return {
    label,
    timestamp: new Date().toISOString(),
    platform: options.platform,
    appId: options.appId,
    deviceId: options.deviceId ?? (options.platform === 'ios' ? 'booted' : null),
    processId: result.pid,
    memory: result.memory,
  };
}

async function collectAndroidMemorySample(
  options: MobileMemoryProfilerOptions,
  runner: CommandRunner,
): Promise<{ pid: number | null; memory: MobileMemoryMetrics }> {
  const [pid, meminfo] = await Promise.all([
    getAndroidPid(options, runner),
    runner('adb', getAdbArgs(options, ['shell', 'dumpsys', 'meminfo', options.appId])),
  ]);

  return {
    pid,
    memory: parseAndroidMeminfo(meminfo.stdout),
  };
}

async function collectIosMemorySample(
  options: MobileMemoryProfilerOptions,
  runner: CommandRunner,
): Promise<{ pid: number | null; memory: MobileMemoryMetrics }> {
  const simulatorDevice = options.deviceId ?? 'booted';
  const result = await runner('xcrun', [
    'simctl',
    'spawn',
    simulatorDevice,
    'ps',
    '-axo',
    'pid=,rss=,vsz=,comm=',
  ]);
  const parsed = parseIosPsOutput(result.stdout, options.iosProcessName);

  if (!parsed) {
    throw new Error(
      `Could not find iOS simulator process "${options.iosProcessName}" in ps output`,
    );
  }

  return parsed;
}

async function runFlowIteration(
  options: MobileMemoryProfilerOptions,
  runner: CommandRunner,
  runtime: AppiumRuntime,
): Promise<void> {
  switch (options.flow) {
    case 'idle':
      await sleep(options.waitAfterFlowMs);
      break;
    case 'relaunch':
      await terminateApp(options, runner);
      await launchApp(options, runner);
      await sleep(options.waitAfterFlowMs);
      break;
    case 'wallet-send-eth-cancel':
      await runWalletSendEthFlow(options, runtime, {
        submitTransaction: false,
      });
      break;
    case 'wallet-send-eth-submit':
      await runWalletSendEthFlow(options, runtime, {
        submitTransaction: true,
      });
      break;
    default:
      assertUnreachable(options.flow);
  }
}

async function runWalletSendEthFlow(
  options: MobileMemoryProfilerOptions,
  runtime: AppiumRuntime,
  { submitTransaction }: { submitTransaction: boolean },
): Promise<void> {
  if (submitTransaction && !options.allowTransactionSubmit) {
    throw new Error(
      '--flow wallet-send-eth-submit can broadcast a real transaction. Re-run with --allow-transaction-submit to acknowledge this.',
    );
  }

  const appiumDriver = await getAppiumDriver(options, runtime);

  await navigateToWalletHome(appiumDriver, options);
  await tapElementById(
    appiumDriver,
    options,
    WALLET_SEND_BUTTON_ID,
    'Wallet Send',
  );
  await tapElementByText(appiumDriver, options, 'Ethereum', 'Ethereum asset');
  await selectSendAmount(appiumDriver, options);
  await tapElementByText(
    appiumDriver,
    options,
    'Continue',
    'Send amount Continue',
  );
  await setElementValueById(
    appiumDriver,
    options,
    RECIPIENT_ADDRESS_INPUT_ID,
    options.recipientAddress,
    'Recipient address input',
  );
  await tapElementById(appiumDriver, options, REVIEW_BUTTON_ID, 'Review');
  await waitForElementById(
    appiumDriver,
    options,
    CONFIRM_BUTTON_ID,
    'Confirm transaction button',
  );

  if (submitTransaction) {
    await tapElementById(
      appiumDriver,
      options,
      CONFIRM_BUTTON_ID,
      'Confirm transaction',
    );
  } else {
    await tapElementById(
      appiumDriver,
      options,
      CANCEL_BUTTON_ID,
      'Cancel transaction',
    );
    await navigateToWalletHome(appiumDriver, options);
  }

  await sleep(options.waitAfterFlowMs);
}

async function getAppiumDriver(
  options: MobileMemoryProfilerOptions,
  runtime: AppiumRuntime,
): Promise<AppiumDriver> {
  if (runtime.driver) {
    return runtime.driver;
  }

  const endpoint = parseAppiumEndpoint(options.appiumUrl);

  if (!options.reuseAppium) {
    assertBundledAppiumEndpoint(endpoint);
    const appiumServerModule = (await import(
      '../../tests/framework/services/appium'
    )) as {
      startAppiumServer(timeoutMs?: number): Promise<ChildProcess>;
    };
    runtime.serverProcess = await appiumServerModule.startAppiumServer(
      options.appiumStartupTimeoutMs,
    );
  }

  const webdriverioModule = (await import('webdriverio')) as unknown as {
    remote(config: AppiumRemoteConfig): Promise<AppiumDriver>;
  };
  runtime.driver = await webdriverioModule.remote(
    createAppiumRemoteConfig(options, endpoint),
  );
  return runtime.driver;
}

type AppiumCapabilityValue = string | number | boolean;

interface AppiumRemoteConfig {
  protocol: 'http' | 'https';
  hostname: string;
  port: number;
  path: string;
  capabilities: Record<string, AppiumCapabilityValue>;
}

function createAppiumRemoteConfig(
  options: MobileMemoryProfilerOptions,
  endpoint: AppiumEndpoint,
): AppiumRemoteConfig {
  const platformName = options.platform === 'android' ? 'Android' : 'iOS';
  const rawCapabilities: Record<string, AppiumCapabilityValue | undefined> = {
    platformName,
    'appium:deviceName': options.deviceId ?? platformName,
    'appium:udid': options.deviceId,
    'appium:automationName':
      options.platform === 'android' ? 'UiAutomator2' : 'XCUITest',
    'appium:newCommandTimeout': 300,
    'appium:autoGrantPermissions': true,
    'appium:autoAcceptAlerts': true,
    'appium:fullReset': false,
    'appium:noReset': true,
    'appium:settings[snapshotMaxDepth]': 62,
    'appium:settings[waitForSelectorTimeout]': 1000,
    'appium:waitForQuiescence': false,
    'appium:animationCoolOffTimeout': 0,
    'appium:disableWindowAnimation': true,
    ...(options.platform === 'android'
      ? {
          'appium:appPackage': options.appId,
          'appium:appActivity': options.androidActivity,
        }
      : {
          'appium:bundleId': options.appId,
        }),
  };

  return {
    ...endpoint,
    capabilities: compactCapabilities(rawCapabilities),
  };
}

function compactCapabilities(
  capabilities: Record<string, AppiumCapabilityValue | undefined>,
): Record<string, AppiumCapabilityValue> {
  return Object.fromEntries(
    Object.entries(capabilities).filter((entry): entry is [
      string,
      AppiumCapabilityValue,
    ] => entry[1] !== undefined),
  );
}

async function cleanupAppiumRuntime(runtime: AppiumRuntime): Promise<void> {
  if (runtime.driver) {
    try {
      await runtime.driver.deleteSession();
    } catch {
      // Appium cleanup is best-effort so the original profiling error is not
      // hidden by a failed session shutdown.
    }
  }

  if (runtime.serverProcess) {
    try {
      const appiumServerModule = (await import(
        '../../tests/framework/services/appium'
      )) as {
        stopAppiumServer(): Promise<string>;
      };
      await appiumServerModule.stopAppiumServer();
    } catch {
      // Best-effort for the same reason as the WebDriver session cleanup.
    }
  }
}

async function navigateToWalletHome(
  appiumDriver: AppiumDriver,
  options: MobileMemoryProfilerOptions,
): Promise<void> {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    if (
      await isElementVisibleById(
        appiumDriver,
        options,
        WALLET_SEND_BUTTON_ID,
        'Wallet Send',
        1200,
      )
    ) {
      return;
    }

    await appiumDriver.back().catch(() => undefined);
    await sleep(500);
  }

  throw new Error(
    'Could not find the wallet Send button. The wallet-send-eth-* flows require an unlocked wallet on, or navigable back to, the Wallet screen.',
  );
}

async function selectSendAmount(
  appiumDriver: AppiumDriver,
  options: MobileMemoryProfilerOptions,
): Promise<void> {
  const amount = options.sendAmount.trim().toLowerCase();
  const percentageAmount =
    amount === 'max' ? '100' : amount.match(/^(\d+)%$/u)?.[1];

  if (percentageAmount) {
    if (!PERCENTAGE_AMOUNTS.has(percentageAmount)) {
      throw new Error(
        '--send-amount percentage must be one of: 25%, 50%, 75%, 100%, max',
      );
    }

    await tapElementById(
      appiumDriver,
      options,
      `percentage-button-${percentageAmount}`,
      `${percentageAmount}% amount button`,
    );
    return;
  }

  if (!/^\d+(?:\.\d+)?$/u.test(amount)) {
    throw new Error(
      '--send-amount must be a decimal amount or one of: 25%, 50%, 75%, 100%, max',
    );
  }

  for (const character of amount) {
    const keyId =
      character === '.' ? 'keypad-key-dot' : `keypad-key-${character}`;
    await tapElementById(
      appiumDriver,
      options,
      keyId,
      `Amount keypad ${character}`,
    );
    await sleep(80);
  }
}

async function tapElementById(
  appiumDriver: AppiumDriver,
  options: MobileMemoryProfilerOptions,
  testId: string,
  description: string,
): Promise<void> {
  const appiumElement = await waitForElementById(
    appiumDriver,
    options,
    testId,
    description,
  );
  await appiumElement.waitForEnabled({ timeout: 5000 }).catch(() => undefined);
  await appiumElement.click();
  await sleep(250);
}

async function tapElementByText(
  appiumDriver: AppiumDriver,
  options: MobileMemoryProfilerOptions,
  text: string,
  description: string,
): Promise<void> {
  const appiumElement = await findElement(
    appiumDriver,
    textSelectors(options.platform, text),
    description,
    options.appiumElementTimeoutMs,
  );
  await appiumElement.waitForEnabled({ timeout: 5000 }).catch(() => undefined);
  await appiumElement.click();
  await sleep(250);
}

async function setElementValueById(
  appiumDriver: AppiumDriver,
  options: MobileMemoryProfilerOptions,
  testId: string,
  value: string,
  description: string,
): Promise<void> {
  const appiumElement = await waitForElementById(
    appiumDriver,
    options,
    testId,
    description,
  );
  await appiumElement.click();
  await appiumElement.setValue(value);
  await appiumDriver.hideKeyboard().catch(() => undefined);
  await sleep(250);
}

async function waitForElementById(
  appiumDriver: AppiumDriver,
  options: MobileMemoryProfilerOptions,
  testId: string,
  description: string,
): Promise<AppiumElement> {
  return findElement(
    appiumDriver,
    idSelectors(options.platform, testId),
    description,
    options.appiumElementTimeoutMs,
  );
}

async function isElementVisibleById(
  appiumDriver: AppiumDriver,
  options: MobileMemoryProfilerOptions,
  testId: string,
  description: string,
  timeoutMs: number,
): Promise<boolean> {
  try {
    const appiumElement = await findElement(
      appiumDriver,
      idSelectors(options.platform, testId),
      description,
      timeoutMs,
    );
    return appiumElement.isDisplayed();
  } catch {
    return false;
  }
}

async function findElement(
  appiumDriver: AppiumDriver,
  selectors: string[],
  description: string,
  timeoutMs: number,
): Promise<AppiumElement> {
  const timeoutPerSelector = Math.max(Math.floor(timeoutMs / selectors.length), 500);

  for (const selector of selectors) {
    const appiumElement = appiumDriver.$(selector);
    try {
      await appiumElement.waitForDisplayed({ timeout: timeoutPerSelector });
      return appiumElement;
    } catch {
      // Try the next selector form. React Native exposes testID differently on
      // Android/iOS and across Appium drivers.
    }
  }

  throw new Error(
    `Could not find ${description}. Tried selectors: ${selectors.join(', ')}`,
  );
}

function idSelectors(
  platform: MobileMemoryPlatform,
  testId: string,
): string[] {
  if (platform === 'android') {
    return [
      `android=new UiSelector().resourceId(${jsonString(testId)})`,
      `android=new UiSelector().resourceIdMatches(${jsonString(
        `.*${escapeRegExp(testId)}.*`,
      )})`,
      `~${testId}`,
      `//*[@resource-id=${xpathLiteral(testId)} or @content-desc=${xpathLiteral(
        testId,
      )}]`,
    ];
  }

  return [
    `~${testId}`,
    `-ios predicate string:name == ${predicateString(
      testId,
    )} OR label == ${predicateString(testId)} OR value == ${predicateString(
      testId,
    )}`,
    `//*[@name=${xpathLiteral(testId)} or @label=${xpathLiteral(
      testId,
    )} or @value=${xpathLiteral(testId)}]`,
  ];
}

function textSelectors(platform: MobileMemoryPlatform, text: string): string[] {
  if (platform === 'android') {
    return [
      `android=new UiSelector().text(${jsonString(text)})`,
      `android=new UiSelector().textContains(${jsonString(text)})`,
      `//*[@text=${xpathLiteral(text)} or contains(@text, ${xpathLiteral(
        text,
      )}) or @content-desc=${xpathLiteral(text)}]`,
    ];
  }

  return [
    `-ios predicate string:name == ${predicateString(
      text,
    )} OR label == ${predicateString(text)} OR value == ${predicateString(
      text,
    )}`,
    `-ios predicate string:name CONTAINS ${predicateString(
      text,
    )} OR label CONTAINS ${predicateString(
      text,
    )} OR value CONTAINS ${predicateString(text)}`,
    `//*[contains(@name, ${xpathLiteral(text)}) or contains(@label, ${xpathLiteral(
      text,
    )}) or contains(@value, ${xpathLiteral(text)})]`,
  ];
}

function parseAppiumEndpoint(appiumUrl: string): AppiumEndpoint {
  try {
    const url = new URL(appiumUrl);
    const protocol = url.protocol.replace(':', '');

    if (protocol !== 'http' && protocol !== 'https') {
      throw new Error('unsupported protocol');
    }

    return {
      protocol,
      hostname: url.hostname,
      port: Number(url.port || (protocol === 'https' ? 443 : 80)),
      path: url.pathname || '/',
    };
  } catch (error) {
    throw new Error(
      `--appium-url must be an HTTP(S) URL, received "${appiumUrl}": ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

function assertBundledAppiumEndpoint(endpoint: AppiumEndpoint): void {
  const defaultEndpoint = parseAppiumEndpoint(DEFAULT_APPIUM_URL);

  if (
    endpoint.protocol !== defaultEndpoint.protocol ||
    endpoint.hostname !== defaultEndpoint.hostname ||
    endpoint.port !== defaultEndpoint.port ||
    endpoint.path !== defaultEndpoint.path
  ) {
    throw new Error(
      '--appium-url can only target a custom endpoint when --reuse-appium is set. The bundled Appium starter listens on http://127.0.0.1:4723/.',
    );
  }
}

function jsonString(value: string): string {
  return JSON.stringify(value);
}

function predicateString(value: string): string {
  return `"${value.replace(/\\/gu, '\\\\').replace(/"/gu, '\\"')}"`;
}

function xpathLiteral(value: string): string {
  if (!value.includes("'")) {
    return `'${value}'`;
  }

  if (!value.includes('"')) {
    return `"${value}"`;
  }

  return `concat('${value.split("'").join(`',"'",'`)}')`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

async function launchApp(
  options: MobileMemoryProfilerOptions,
  runner: CommandRunner,
): Promise<void> {
  if (options.platform === 'android') {
    const args = getAdbArgs(options, [
      'shell',
      'am',
      'start',
      '-n',
      `${options.appId}/${options.androidActivity}`,
    ]);

    if (options.enableInAppProfiler) {
      args.push('--es', 'enableProfiler', 'true');
    }

    await runner('adb', args);
    return;
  }

  const args = [
    'simctl',
    'launch',
    options.deviceId ?? 'booted',
    options.appId,
  ];

  if (options.enableInAppProfiler) {
    args.push('-enableProfiler', 'true');
  }

  await runner('xcrun', args);
}

async function terminateApp(
  options: MobileMemoryProfilerOptions,
  runner: CommandRunner,
): Promise<void> {
  if (options.platform === 'android') {
    await runner('adb', getAdbArgs(options, ['shell', 'am', 'force-stop', options.appId]));
    return;
  }

  await runner('xcrun', [
    'simctl',
    'terminate',
    options.deviceId ?? 'booted',
    options.appId,
  ]);
}

async function getAndroidPid(
  options: MobileMemoryProfilerOptions,
  runner: CommandRunner,
): Promise<number | null> {
  try {
    const result = await runner(
      'adb',
      getAdbArgs(options, ['shell', 'pidof', options.appId]),
    );
    const firstPid = result.stdout.trim().split(/\s+/u)[0];
    return firstPid ? Number(firstPid) : null;
  } catch {
    return null;
  }
}

async function maybeRunHermesProfileCli(
  options: MobileMemoryProfilerOptions,
  runner: CommandRunner,
): Promise<HermesProfileCliResult | null> {
  if (!options.pullHermesProfile && !options.hermesProfilePath) {
    return null;
  }

  if (options.pullHermesProfile && options.platform !== 'android') {
    throw new Error('--pull-hermes-profile is supported only for Android');
  }

  const args = ['react-native-release-profiler'];

  if (options.hermesProfilePath) {
    args.push('--local', options.hermesProfilePath);
  } else {
    args.push('--fromDownload', '--appId', options.appId);
  }

  if (options.sourcemapPath) {
    args.push('--sourcemap-path', options.sourcemapPath);
  }

  const result = await runner('yarn', args, { cwd: options.artifactDir });

  return {
    command: ['yarn', ...args].join(' '),
    cwd: options.artifactDir,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

function runCommand(
  command: string,
  args: string[],
  options: { cwd?: string } = {},
): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    execFile(
      command,
      args,
      {
        cwd: options.cwd,
        encoding: 'utf8',
        maxBuffer: COMMAND_MAX_BUFFER,
      },
      (error, stdout, stderr) => {
        if (error) {
          const stderrText = typeof stderr === 'string' ? stderr : '';
          const stdoutText = typeof stdout === 'string' ? stdout : '';
          reject(
            new Error(
              `${command} ${args.join(' ')} failed: ${
                stderrText || stdoutText || error.message
              }`,
            ),
          );
          return;
        }

        resolve({
          stdout: typeof stdout === 'string' ? stdout : '',
          stderr: typeof stderr === 'string' ? stderr : '',
        });
      },
    );
  });
}

function getAdbArgs(
  options: Pick<MobileMemoryProfilerOptions, 'deviceId'>,
  args: string[],
): string[] {
  return options.deviceId ? ['-s', options.deviceId, ...args] : args;
}

function createThresholdEvaluation({
  name,
  limit,
  actual,
}: Pick<
  MobileMemoryThresholdEvaluation,
  'name' | 'limit' | 'actual'
>): MobileMemoryThresholdEvaluation {
  return {
    name,
    limit,
    actual,
    unit: 'bytes',
    passed: actual !== null && actual <= limit,
  };
}

function readArgValue(
  argv: string[],
  valueIndex: number,
  optionName: string,
): string {
  const value = argv[valueIndex];

  if (!value || value.startsWith('--')) {
    throw new Error(`${optionName} requires a value`);
  }

  return value;
}

function parsePositiveInteger(value: string, optionName: string): number {
  const parsed = parseNonNegativeInteger(value, optionName);

  if (parsed < 1) {
    throw new Error(`${optionName} must be greater than 0`);
  }

  return parsed;
}

function parseNonNegativeInteger(value: string, optionName: string): number {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${optionName} must be a non-negative integer`);
  }

  return parsed;
}

function parseChoice<Choice extends string>(
  value: string,
  validValues: readonly Choice[],
  optionName: string,
): Choice {
  if (!validValues.includes(value as Choice)) {
    throw new Error(`${optionName} must be one of: ${validValues.join(', ')}`);
  }

  return value as Choice;
}

function parseKbMatch(input: string, regex: RegExp): number | null {
  const match = input.match(regex);
  return match?.[1] ? kbStringToBytes(match[1]) : null;
}

function kbStringToBytes(value: string): number {
  return Number(value.replace(/,/gu, '')) * 1024;
}

function delta(
  baselineValue: number | null | undefined,
  finalValue: number | null | undefined,
): number | null {
  if (baselineValue === null || baselineValue === undefined) {
    return null;
  }

  if (finalValue === null || finalValue === undefined) {
    return null;
  }

  return finalValue - baselineValue;
}

function resolveOutputPath(outputPath: string): string {
  return path.isAbsolute(outputPath) ? outputPath : path.resolve(outputPath);
}

function createDefaultOutputPath(
  artifactDir: string,
  platform: MobileMemoryPlatform,
): string {
  return path.join(
    artifactDir,
    `mobile-${platform}-memory-profile-${Date.now()}.json`,
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function assertUnreachable(value: never): never {
  throw new Error(`Unexpected value: ${value}`);
}

if (typeof require !== 'undefined' && require.main === module) {
  main().catch((error: Error) => {
    console.error(error.message);
    process.exit(1);
  });
}
