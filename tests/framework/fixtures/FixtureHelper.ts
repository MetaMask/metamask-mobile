/* eslint-disable no-unsafe-finally */
/* eslint-disable import-x/no-nodejs-modules */
import FixtureServer from './FixtureServer';
import {
  AnvilManager,
  Hardfork,
  DEFAULT_ANVIL_PORT,
} from '../../seeder/anvil-manager';
import Ganache, { DEFAULT_GANACHE_PORT } from '../../../app/util/test/ganache';
import GanacheSeeder from '../../../app/util/test/ganache-seeder';
import axios from 'axios';
import path from 'path';
import { access, copyFile, mkdir, readFile, rm, writeFile } from 'fs/promises';
import { execFile } from 'child_process';
import { promisify } from 'util';
import {
  getFixturesServerPort,
  startResourceWithRetry,
  startMultiInstanceResourceWithRetry,
  cleanupAllAndroidPortForwarding,
} from './FixtureUtils';
import Utilities from '../Utilities';
import {
  dismissDevScreens,
  dismissDevScreensPlaywright,
} from '../../flows/general.flow';
import TestHelpers from '../../helpers';
import MockServerE2E from '../../api-mocking/MockServerE2E';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper';
import { AnvilSeeder } from '../../seeder/anvil-seeder';
import {
  LocalNodeConfig,
  LocalNodeOptionsInput,
  LocalNodeType,
  WithFixturesOptions,
  TestSuiteFunction,
  LocalNode,
  DappOptions,
  AnvilNodeOptions,
  GanacheNodeOptions,
  TestSpecificMock,
} from '../types';
import {
  TestDapps,
  DappVariants,
  defaultGanacheOptions,
  FALLBACK_DAPP_SERVER_PORT,
  FALLBACK_MOCKSERVER_PORT,
  FALLBACK_FIXTURE_SERVER_PORT,
  FALLBACK_COMMAND_QUEUE_SERVER_PORT,
} from '../Constants';
import ContractAddressRegistry from '../../../app/util/test/contract-address-registry';
import FixtureBuilder from './FixtureBuilder';
import { createLogger } from '../logger';
import { mockNotificationServices } from '../../smoke/notifications/utils/mocks';
import {
  runAnalyticsExpectations,
  shouldRunAnalyticsExpectations,
} from '../../helpers/analytics/runAnalyticsExpectations';
import PortManager, { ResourceType } from '../PortManager';
import { DEFAULT_MOCKS } from '../../api-mocking/mock-responses/defaults';
import type { Fixture } from './types';
import CommandQueueServer from './CommandQueueServer';
import DappServer from '../DappServer';
import { PlatformDetector } from '../PlatformLocator';
import LocalWebSocketServer from '../../websocket/server';
import {
  ACCOUNT_ACTIVITY_WS,
  SOLANA_INFURA_WS,
} from '../../websocket/constants';
import {
  setupAccountActivityMocks,
  resetAccountActivityMockState,
} from '../../websocket/account-activity-mocks';
import { FrameworkDetector } from '../FrameworkDetector';
import PlaywrightUtilities from '../PlaywrightUtilities';
import { DeviceCommandHandler } from '../services/device-commands';
import { setupSolanaInfuraMocks } from '../../websocket/solana-infura-mocks';

const logger = createLogger({
  name: 'FixtureHelper',
});

const execFileAsync = promisify(execFile);

const IOS_E2E_PROXY_CA_CERT_PATH = path.resolve(
  process.cwd(),
  '.e2e-proxy-ca/proxy-ca.cer',
);
const IOS_E2E_PROXY_MOBILECONFIG_PATH = path.resolve(
  process.cwd(),
  'e2e-proxy.mobileconfig',
);
const IOS_E2E_PROXY_HOST = '127.0.0.1';
const IOS_E2E_PROXY_SET_ID = 'E2E-PROXY-SET';
const IOS_E2E_PROXY_SERVICE_ID = 'E2E-PROXY-SERVICE';
const IOS_E2E_PROXY_BACKUP_SUFFIX = '.e2e-proxy-backup';
const IOS_E2E_PROXY_HTTP_PROBE_URL_BASE =
  'http://e2e-proxy.invalid/__e2e_ios_proxy_probe__';
const IOS_E2E_PROXY_HTTPS_PROBE_URL_BASE =
  'https://e2e-proxy.invalid/__e2e_ios_proxy_probe__';
const IOS_E2E_PROXY_LOCAL_PROBE_PATH = '/__e2e_ios_proxy_local_probe__';
const IOS_E2E_APP_PROXY_LAUNCH_ARG = 'e2eIosProxyPort';
const IOS_E2E_PF_TRANSPARENT_PROXY_ANCHOR =
  'com.apple/e2e-metamask-mobile-proxy';
const IOS_E2E_PF_TRANSPARENT_PROXY_RULES_PATH = path.join(
  '/private/tmp',
  `metamask-mobile-e2e-proxy-${process.pid}.pf.conf`,
);

interface IosSimulatorProxyFileState {
  preferencesPath: string;
  backupPath: string;
  hadExistingPreferences: boolean;
}

type IosSimulatorProxyState = IosSimulatorProxyFileState[];

interface MacosManualProxySettings {
  enabled: boolean;
  server: string;
  port: number;
}

interface MacosSystemProxyState {
  networkService: string;
  webProxy: MacosManualProxySettings;
  secureWebProxy: MacosManualProxySettings;
  bypassDomains: string[];
}

interface IosPfTransparentProxyState {
  anchor: string;
  enableToken: string | null;
  rulesPath: string;
}

function getIosSimulatorUdid(): string {
  const udid = process.env.DEVICE_UDID || device.id;
  if (!udid) {
    throw new Error('DEVICE_UDID or Detox device.id is required for simctl');
  }
  return udid;
}

function isAlreadyBootedError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes('Unable to boot device in current state') ||
    message.includes('current state: Booted')
  );
}

function isAlreadyShutdownError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes('Unable to shutdown device in current state') ||
    message.includes('current state: Shutdown')
  );
}

async function runSimctl(args: string[]): Promise<void> {
  logger.debug(`Running simctl ${args.join(' ')}`);
  const { stdout, stderr } = await execFileAsync('xcrun', ['simctl', ...args]);

  if (stdout) {
    logger.debug(stdout.trim());
  }
  if (stderr) {
    logger.warn(stderr.trim());
  }
}

async function runNetworksetup(args: string[]): Promise<void> {
  logger.debug(`Running networksetup ${args.join(' ')}`);
  const { stdout, stderr } = await execFileAsync('networksetup', args);
  assertNetworksetupSucceeded(stdout, stderr);

  if (stdout) {
    logger.debug(stdout.trim());
  }
  if (stderr) {
    logger.warn(stderr.trim());
  }
}

async function runPfctl(args: string[]): Promise<string> {
  logger.debug(`Running sudo -n pfctl ${args.join(' ')}`);

  try {
    const { stdout, stderr } = await execFileAsync('sudo', [
      '-n',
      'pfctl',
      ...args,
    ]);

    if (stdout) {
      logger.debug(stdout.trim());
    }
    if (stderr) {
      logger.warn(stderr.trim());
    }

    return `${stdout}\n${stderr}`;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `[E2E_IOS_PF_TRANSPARENT_PROXY] pfctl failed. Run "sudo -v" before the E2E run or disable E2E_IOS_USE_PF_TRANSPARENT_PROXY. ${message}`,
    );
  }
}

async function getNetworksetupOutput(args: string[]): Promise<string> {
  logger.debug(`Running networksetup ${args.join(' ')}`);
  const { stdout, stderr } = await execFileAsync('networksetup', args);
  assertNetworksetupSucceeded(stdout, stderr);

  if (stderr) {
    logger.warn(stderr.trim());
  }

  return stdout;
}

function assertNetworksetupSucceeded(stdout: string, stderr: string): void {
  const output = `${stdout}\n${stderr}`;
  if (output.includes('AuthorizationCreate() failed')) {
    throw new Error(output.trim());
  }
}

async function tryRunSimctl(
  args: string[],
  description: string,
): Promise<void> {
  try {
    await runSimctl(args);
  } catch (error) {
    logger.warn(
      `[E2E_IOS_PROXY_PRIVATE_MUTATION] Failed to ${description}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

function getMacosProxyValue(output: string, key: string): string {
  const line = output
    .split(/\r?\n/)
    .find((entry) => entry.toLowerCase().startsWith(`${key.toLowerCase()}:`));

  return line?.slice(line.indexOf(':') + 1).trim() ?? '';
}

function parseMacosManualProxySettings(
  output: string,
): MacosManualProxySettings {
  return {
    enabled: getMacosProxyValue(output, 'Enabled').toLowerCase() === 'yes',
    server: getMacosProxyValue(output, 'Server'),
    port: Number(getMacosProxyValue(output, 'Port')) || 0,
  };
}

function parseMacosProxyBypassDomains(output: string): string[] {
  if (output.includes("There aren't any bypass domains")) {
    return [];
  }

  return output
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

async function getMacosSystemProxyState(
  networkService: string,
): Promise<MacosSystemProxyState> {
  const [webProxyOutput, secureWebProxyOutput, bypassDomainsOutput] =
    await Promise.all([
      getNetworksetupOutput(['-getwebproxy', networkService]),
      getNetworksetupOutput(['-getsecurewebproxy', networkService]),
      getNetworksetupOutput(['-getproxybypassdomains', networkService]),
    ]);

  return {
    networkService,
    webProxy: parseMacosManualProxySettings(webProxyOutput),
    secureWebProxy: parseMacosManualProxySettings(secureWebProxyOutput),
    bypassDomains: parseMacosProxyBypassDomains(bypassDomainsOutput),
  };
}

async function configureMacosSystemProxy(
  mockServerPort: number,
): Promise<MacosSystemProxyState | null> {
  if (!(await PlatformDetector.isIOS())) {
    return null;
  }

  if (process.env.E2E_IOS_USE_MACOS_SYSTEM_PROXY !== '1') {
    logger.debug(
      '[E2E_IOS_MACOS_SYSTEM_PROXY_SKIPPED] macOS system proxy disabled. Set E2E_IOS_USE_MACOS_SYSTEM_PROXY=1 to retry it.',
    );
    return null;
  }

  const networkService = process.env.E2E_IOS_MACOS_NETWORK_SERVICE || 'Wi-Fi';
  const previousProxyState = await getMacosSystemProxyState(networkService);
  const proxyPort = String(mockServerPort);

  await runNetworksetup([
    '-setwebproxy',
    networkService,
    IOS_E2E_PROXY_HOST,
    proxyPort,
  ]);
  await runNetworksetup([
    '-setsecurewebproxy',
    networkService,
    IOS_E2E_PROXY_HOST,
    proxyPort,
  ]);
  await runNetworksetup(['-setwebproxystate', networkService, 'on']);
  await runNetworksetup(['-setsecurewebproxystate', networkService, 'on']);
  await runNetworksetup([
    '-setproxybypassdomains',
    networkService,
    'localhost',
    '127.0.0.1',
    '::1',
    '*.local',
    '169.254/16',
  ]);

  logger.warn(
    `[E2E_IOS_MACOS_SYSTEM_PROXY_ENABLED] Routing macOS ${networkService} HTTP/HTTPS proxy through ${IOS_E2E_PROXY_HOST}:${mockServerPort}. This is host-wide and will be restored during fixture cleanup.`,
  );

  return previousProxyState;
}

async function restoreMacosManualProxy(
  networkService: string,
  proxySettings: MacosManualProxySettings,
  setProxyCommand: '-setwebproxy' | '-setsecurewebproxy',
  setProxyStateCommand: '-setwebproxystate' | '-setsecurewebproxystate',
): Promise<void> {
  if (proxySettings.server && proxySettings.port) {
    await runNetworksetup([
      setProxyCommand,
      networkService,
      proxySettings.server,
      String(proxySettings.port),
    ]);
  }

  await runNetworksetup([
    setProxyStateCommand,
    networkService,
    proxySettings.enabled ? 'on' : 'off',
  ]);
}

async function cleanupMacosSystemProxy(
  proxyState: MacosSystemProxyState | null,
): Promise<void> {
  if (!proxyState) {
    return;
  }

  await restoreMacosManualProxy(
    proxyState.networkService,
    proxyState.webProxy,
    '-setwebproxy',
    '-setwebproxystate',
  );
  await restoreMacosManualProxy(
    proxyState.networkService,
    proxyState.secureWebProxy,
    '-setsecurewebproxy',
    '-setsecurewebproxystate',
  );
  await runNetworksetup([
    '-setproxybypassdomains',
    proxyState.networkService,
    ...(proxyState.bypassDomains.length ? proxyState.bypassDomains : ['Empty']),
  ]);

  logger.warn(
    `[E2E_IOS_MACOS_SYSTEM_PROXY_RESTORED] Restored macOS ${proxyState.networkService} proxy settings`,
  );
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function getIosSimulatorDataPath(deviceUdid: string): string {
  const homeDirectory = process.env.HOME;
  if (!homeDirectory) {
    throw new Error('HOME is required to locate iOS simulator data');
  }

  return path.join(
    homeDirectory,
    'Library/Developer/CoreSimulator/Devices',
    deviceUdid,
    'data',
  );
}

function getIosSimulatorPreferencesPaths(deviceUdid: string): string[] {
  const simulatorDataPath = getIosSimulatorDataPath(deviceUdid);

  return [
    path.join(
      simulatorDataPath,
      'Library/Preferences/SystemConfiguration/preferences.plist',
    ),
    path.join(
      simulatorDataPath,
      'private/var/preferences/SystemConfiguration/preferences.plist',
    ),
  ];
}

function getIosSimulatorManagedPreferencesPaths(deviceUdid: string): string[] {
  const simulatorDataPath = getIosSimulatorDataPath(deviceUdid);

  return [
    path.join(
      simulatorDataPath,
      'Library/Managed Preferences/mobile/com.apple.SystemConfiguration.plist',
    ),
    path.join(
      simulatorDataPath,
      'private/var/managedpreferences/mobile/com.apple.SystemConfiguration.plist',
    ),
  ];
}

async function refreshIosSimulatorProxyPreferences(
  deviceUdid: string,
): Promise<void> {
  await tryRunSimctl(
    [
      'spawn',
      deviceUdid,
      '/bin/launchctl',
      'kickstart',
      '-k',
      'system/com.apple.cfprefsd.xpc.daemon',
    ],
    'restart simulator preference cache',
  );
  await tryRunSimctl(
    [
      'spawn',
      deviceUdid,
      'notifyutil',
      '-p',
      'com.apple.system.config.network_change',
    ],
    'notify simulator network configuration change',
  );
}

async function bootIosSimulator(deviceUdid: string): Promise<void> {
  try {
    await runSimctl(['boot', deviceUdid]);
  } catch (error) {
    if (!isAlreadyBootedError(error)) {
      throw error;
    }
  }

  await tryRunSimctl(['bootstatus', deviceUdid, '-b'], 'wait for iOS boot');
}

function assertValidIosProxyPort(mockServerPort: number): void {
  if (
    !Number.isInteger(mockServerPort) ||
    mockServerPort < 1 ||
    mockServerPort > 65535
  ) {
    throw new Error(
      `Invalid mock server port for iOS proxy: ${mockServerPort}`,
    );
  }
}

async function updateIosProxyMobileconfigPort(
  mockServerPort: number,
): Promise<void> {
  if (!(await PlatformDetector.isIOS())) {
    return;
  }

  assertValidIosProxyPort(mockServerPort);

  if (!(await fileExists(IOS_E2E_PROXY_MOBILECONFIG_PATH))) {
    logger.warn(
      `[E2E_IOS_PROXY_MOBILECONFIG_MISSING] ${IOS_E2E_PROXY_MOBILECONFIG_PATH} not found; skipping profile port update.`,
    );
    return;
  }

  const profileContents = await readFile(
    IOS_E2E_PROXY_MOBILECONFIG_PATH,
    'utf8',
  );
  const updatedProfileContents = profileContents.replace(
    /(<key>ProxyServerPort<\/key>\s*<integer>)\d+(<\/integer>)/u,
    `$1${mockServerPort}$2`,
  );

  if (updatedProfileContents === profileContents) {
    throw new Error(
      `Could not find ProxyServerPort in ${IOS_E2E_PROXY_MOBILECONFIG_PATH}`,
    );
  }

  await writeFile(
    IOS_E2E_PROXY_MOBILECONFIG_PATH,
    updatedProfileContents,
    'utf8',
  );

  logger.warn(
    `[E2E_IOS_PROXY_MOBILECONFIG_PORT_UPDATED] ${IOS_E2E_PROXY_MOBILECONFIG_PATH} now points to ${IOS_E2E_PROXY_HOST}:${mockServerPort}`,
  );
}

function buildIosProxyDictionaryEntries(
  mockServerPort: number,
  indentation: string,
): string {
  assertValidIosProxyPort(mockServerPort);

  return `${indentation}<key>ExceptionsList</key>
${indentation}<array>
${indentation}  <string>*.local</string>
${indentation}  <string>169.254/16</string>
${indentation}</array>
${indentation}<key>FTPPassive</key>
${indentation}<integer>1</integer>
${indentation}<key>HTTPEnable</key>
${indentation}<integer>1</integer>
${indentation}<key>HTTPPort</key>
${indentation}<integer>${mockServerPort}</integer>
${indentation}<key>HTTPProxy</key>
${indentation}<string>${IOS_E2E_PROXY_HOST}</string>
${indentation}<key>HTTPSEnable</key>
${indentation}<integer>1</integer>
${indentation}<key>HTTPSPort</key>
${indentation}<integer>${mockServerPort}</integer>
${indentation}<key>HTTPSProxy</key>
${indentation}<string>${IOS_E2E_PROXY_HOST}</string>
${indentation}<key>ProxyAutoDiscoveryEnable</key>
${indentation}<integer>0</integer>`;
}

function buildIosSimulatorProxyPreferences(mockServerPort: number): string {
  const proxyDictionaryEntries = buildIosProxyDictionaryEntries(
    mockServerPort,
    '        ',
  );

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>__VERSION__</key>
  <integer>20191120</integer>
  <key>CurrentSet</key>
  <string>/Sets/${IOS_E2E_PROXY_SET_ID}</string>
  <key>NetworkServices</key>
  <dict>
    <key>${IOS_E2E_PROXY_SERVICE_ID}</key>
    <dict>
      <key>DNS</key>
      <dict/>
      <key>Interface</key>
      <dict>
        <key>DeviceName</key>
        <string>en0</string>
        <key>Hardware</key>
        <string>AirPort</string>
        <key>Type</key>
        <string>Ethernet</string>
        <key>UserDefinedName</key>
        <string>Wi-Fi</string>
      </dict>
      <key>IPv4</key>
      <dict>
        <key>ConfigMethod</key>
        <string>DHCP</string>
      </dict>
      <key>IPv6</key>
      <dict>
        <key>ConfigMethod</key>
        <string>Automatic</string>
      </dict>
      <key>Proxies</key>
      <dict>
${proxyDictionaryEntries}
      </dict>
      <key>SMB</key>
      <dict/>
      <key>UserDefinedName</key>
      <string>Wi-Fi</string>
    </dict>
  </dict>
  <key>Sets</key>
  <dict>
    <key>${IOS_E2E_PROXY_SET_ID}</key>
    <dict>
      <key>Network</key>
      <dict>
        <key>Global</key>
        <dict>
          <key>IPv4</key>
          <dict>
            <key>ServiceOrder</key>
            <array>
              <string>${IOS_E2E_PROXY_SERVICE_ID}</string>
            </array>
          </dict>
        </dict>
        <key>Service</key>
        <dict>
          <key>${IOS_E2E_PROXY_SERVICE_ID}</key>
          <dict>
            <key>__LINK__</key>
            <string>/NetworkServices/${IOS_E2E_PROXY_SERVICE_ID}</string>
          </dict>
        </dict>
      </dict>
    </dict>
  </dict>
</dict>
</plist>
`;
}

function buildIosSimulatorManagedProxyPreferences(
  mockServerPort: number,
): string {
  const proxyDictionaryEntries = buildIosProxyDictionaryEntries(
    mockServerPort,
    '    ',
  );

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Proxies</key>
  <dict>
${proxyDictionaryEntries}
  </dict>
</dict>
</plist>
`;
}

async function writeIosSimulatorProxyFile(
  preferencesPath: string,
  fileContents: string,
  description: string,
): Promise<IosSimulatorProxyFileState> {
  const backupPath = `${preferencesPath}${IOS_E2E_PROXY_BACKUP_SUFFIX}`;

  await mkdir(path.dirname(preferencesPath), { recursive: true });

  const hadExistingPreferences = await fileExists(preferencesPath);
  if (hadExistingPreferences) {
    await copyFile(preferencesPath, backupPath);
  } else {
    await rm(backupPath, { force: true });
  }

  await writeFile(preferencesPath, fileContents, 'utf8');

  logger.warn(
    `[E2E_IOS_PROXY_PRIVATE_MUTATION] Wrote ${description} to ${preferencesPath}`,
  );

  return {
    preferencesPath,
    backupPath,
    hadExistingPreferences,
  };
}

function writeIosSimulatorProxyPreferences(
  preferencesPath: string,
  mockServerPort: number,
): Promise<IosSimulatorProxyFileState> {
  return writeIosSimulatorProxyFile(
    preferencesPath,
    buildIosSimulatorProxyPreferences(mockServerPort),
    'simulator proxy preferences',
  );
}

function writeIosSimulatorManagedProxyPreferences(
  preferencesPath: string,
  mockServerPort: number,
): Promise<IosSimulatorProxyFileState> {
  return writeIosSimulatorProxyFile(
    preferencesPath,
    buildIosSimulatorManagedProxyPreferences(mockServerPort),
    'simulator managed proxy preferences',
  );
}

function getIosProxyProbeUrls(): string[] {
  const timestamp = Date.now();
  return [
    `${IOS_E2E_PROXY_HTTP_PROBE_URL_BASE}?ts=${timestamp}`,
    `${IOS_E2E_PROXY_HTTPS_PROBE_URL_BASE}?ts=${timestamp}`,
  ];
}

function getIosProxyLocalProbeUrl(mockServerPort: number): string {
  return `http://${IOS_E2E_PROXY_HOST}:${mockServerPort}${IOS_E2E_PROXY_LOCAL_PROBE_PATH}?ts=${Date.now()}`;
}

function shouldUsePrivateIosSimulatorProxyMutation(): boolean {
  return process.env.E2E_IOS_USE_PRIVATE_SIMULATOR_PROXY_MUTATION === '1';
}

function shouldUseIosPfTransparentProxy(): boolean {
  return process.env.E2E_IOS_USE_PF_TRANSPARENT_PROXY === '1';
}

function shouldUseIosAppProxyLaunchArg(): boolean {
  return (
    !shouldUseIosPfTransparentProxy() &&
    !shouldUsePrivateIosSimulatorProxyMutation() &&
    process.env.E2E_IOS_USE_MACOS_SYSTEM_PROXY !== '1'
  );
}

function shouldRunIosDeviceLevelProxyProbe(): boolean {
  return (
    shouldUsePrivateIosSimulatorProxyMutation() ||
    process.env.E2E_IOS_USE_MACOS_SYSTEM_PROXY === '1' ||
    shouldUseIosPfTransparentProxy()
  );
}

function parsePfEnableToken(output: string): string | null {
  return output.match(/Token\s*:\s*(\S+)/u)?.[1] ?? null;
}

async function getMacosDefaultNetworkInterface(): Promise<string | null> {
  try {
    const { stdout, stderr } = await execFileAsync('route', [
      '-n',
      'get',
      'default',
    ]);

    if (stderr) {
      logger.warn(stderr.trim());
    }

    return stdout.match(/^\s*interface:\s*(\S+)/mu)?.[1]?.trim() ?? null;
  } catch (error) {
    logger.warn(
      `[E2E_IOS_PF_TRANSPARENT_PROXY] Failed to detect default network interface: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return null;
  }
}

async function getIosPfTransparentProxyInterfaces(): Promise<string[]> {
  const configuredInterfaces = process.env.E2E_IOS_PF_INTERFACES?.split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (configuredInterfaces?.length) {
    return Array.from(new Set(configuredInterfaces));
  }

  const defaultInterface = await getMacosDefaultNetworkInterface();
  return Array.from(
    new Set(
      ['lo0', defaultInterface].filter(
        (networkInterface): networkInterface is string =>
          Boolean(networkInterface),
      ),
    ),
  );
}

function buildIosPfTransparentProxyRules(
  mockServerPort: number,
  interfaces: string[],
): string {
  assertValidIosProxyPort(mockServerPort);

  const source = process.env.E2E_IOS_PF_SOURCE || 'any';
  const bypassTableName = 'e2e_ios_proxy_bypass';
  const bypassDestinations =
    process.env.E2E_IOS_PF_BYPASS_DESTINATIONS ||
    '{ 127.0.0.1, 10.0.2.2, 169.254.0.0/16, 224.0.0.0/4, 255.255.255.255 }';

  return [
    '# MetaMask Mobile E2E transparent proxy diagnostics.',
    '# Loaded under the com.apple/* pf anchor point and flushed during fixture cleanup.',
    `table <${bypassTableName}> const ${bypassDestinations}`,
    ...interfaces.map(
      (networkInterface) =>
        `rdr pass log on ${networkInterface} inet proto tcp from ${source} to ! <${bypassTableName}> port { 80, 443 } -> 127.0.0.1 port ${mockServerPort}`,
    ),
    '',
  ].join('\n');
}

async function configureIosPfTransparentProxy(
  mockServerPort: number,
): Promise<IosPfTransparentProxyState | null> {
  if (!(await PlatformDetector.isIOS()) || !shouldUseIosPfTransparentProxy()) {
    logger.debug(
      '[E2E_IOS_PF_TRANSPARENT_PROXY_SKIPPED] pf transparent proxy disabled. Set E2E_IOS_USE_PF_TRANSPARENT_PROXY=1 to enable diagnostic routing.',
    );
    return null;
  }

  const networkInterfaces = await getIosPfTransparentProxyInterfaces();
  const rules = buildIosPfTransparentProxyRules(
    mockServerPort,
    networkInterfaces,
  );

  await writeFile(IOS_E2E_PF_TRANSPARENT_PROXY_RULES_PATH, rules, 'utf8');
  await runPfctl(['-a', IOS_E2E_PF_TRANSPARENT_PROXY_ANCHOR, '-F', 'all']);
  await runPfctl([
    '-a',
    IOS_E2E_PF_TRANSPARENT_PROXY_ANCHOR,
    '-f',
    IOS_E2E_PF_TRANSPARENT_PROXY_RULES_PATH,
  ]);

  const enableOutput = await runPfctl(['-E']);
  const enableToken = parsePfEnableToken(enableOutput);

  if (!enableToken) {
    logger.warn(
      '[E2E_IOS_PF_TRANSPARENT_PROXY] pfctl -E did not return a token; cleanup will flush the anchor but cannot release an enable reference.',
    );
  }

  logger.warn(
    `[E2E_IOS_PF_TRANSPARENT_PROXY_ENABLED] Redirecting host/simulator TCP 80/443 on ${networkInterfaces.join(
      ', ',
    )} to Mockttp port ${mockServerPort}. This is diagnostic and host-affecting while the fixture is running.`,
  );
  logger.warn(
    `[E2E_IOS_PF_TRANSPARENT_PROXY_RULES] ${rules
      .trim()
      .replace(/\r?\n/gu, ' | ')}`,
  );

  return {
    anchor: IOS_E2E_PF_TRANSPARENT_PROXY_ANCHOR,
    enableToken,
    rulesPath: IOS_E2E_PF_TRANSPARENT_PROXY_RULES_PATH,
  };
}

async function cleanupIosPfTransparentProxy(
  proxyState: IosPfTransparentProxyState | null,
): Promise<void> {
  if (!proxyState) {
    return;
  }

  await runPfctl(['-a', proxyState.anchor, '-F', 'all']);

  if (proxyState.enableToken) {
    await runPfctl(['-X', proxyState.enableToken]);
  }

  await rm(proxyState.rulesPath, { force: true });

  logger.warn(
    `[E2E_IOS_PF_TRANSPARENT_PROXY_RESTORED] Flushed pf anchor ${proxyState.anchor}`,
  );
}

async function configureIosSimulatorProxy(
  mockServerPort: number,
  shouldRebootSimulator: boolean,
): Promise<IosSimulatorProxyState | null> {
  if (!(await PlatformDetector.isIOS())) {
    return null;
  }

  const deviceUdid = getIosSimulatorUdid();
  const preferencesPaths = getIosSimulatorPreferencesPaths(deviceUdid);
  const managedPreferencesPaths =
    getIosSimulatorManagedPreferencesPaths(deviceUdid);
  const shouldMutateSimulatorPreferences =
    shouldUsePrivateIosSimulatorProxyMutation();
  let proxyState: IosSimulatorProxyState | null = null;

  if (shouldMutateSimulatorPreferences) {
    if (shouldRebootSimulator) {
      try {
        await runSimctl(['shutdown', deviceUdid]);
      } catch (error) {
        if (!isAlreadyShutdownError(error)) {
          throw error;
        }
      }
    } else {
      await bootIosSimulator(deviceUdid);
    }

    proxyState = await Promise.all([
      ...preferencesPaths.map((preferencesPath) =>
        writeIosSimulatorProxyPreferences(preferencesPath, mockServerPort),
      ),
      ...managedPreferencesPaths.map((preferencesPath) =>
        writeIosSimulatorManagedProxyPreferences(
          preferencesPath,
          mockServerPort,
        ),
      ),
    ]);

    if (shouldRebootSimulator) {
      await bootIosSimulator(deviceUdid);
    } else {
      logger.warn(
        '[E2E_IOS_PROXY_PRIVATE_MUTATION] Simulator was not rebooted; private proxy preferences may not apply until next boot',
      );
      await refreshIosSimulatorProxyPreferences(deviceUdid);
    }
  } else {
    await bootIosSimulator(deviceUdid);
    logger.warn(
      '[E2E_IOS_PROXY_PRIVATE_MUTATION_SKIPPED] Simulator plist mutation disabled. Set E2E_IOS_USE_PRIVATE_SIMULATOR_PROXY_MUTATION=1 to retry it.',
    );
  }

  await runSimctl([
    'keychain',
    deviceUdid,
    'add-root-cert',
    IOS_E2E_PROXY_CA_CERT_PATH,
  ]);

  if (shouldRebootSimulator) {
    await tryRunSimctl(
      ['openurl', deviceUdid, getIosProxyLocalProbeUrl(mockServerPort)],
      'open iOS local mockserver probe URL',
    );
    logger.warn(
      `[E2E_IOS_PROXY_LOCAL_PROBE] Opened local mockserver probe. Search for E2E_IOS_PROXY_LOCAL_PROBE_REQUEST to verify simulator-to-Mockttp reachability.`,
    );

    if (shouldRunIosDeviceLevelProxyProbe()) {
      for (const proxyProbeUrl of getIosProxyProbeUrls()) {
        await tryRunSimctl(
          ['openurl', deviceUdid, proxyProbeUrl],
          'open iOS proxy probe URL',
        );
        logger.warn(
          `[E2E_IOS_PROXY_PROBE] Opened ${proxyProbeUrl}. Search for E2E_DEVICE_PROXY_REQUEST_INITIATED, E2E_DEVICE_PROXY_DIRECT_REQUEST, or E2E_DEVICE_PROXY_TLS_CLIENT_ERROR to verify simulator-level proxy traffic.`,
        );
      }
    } else {
      logger.warn(
        `[E2E_IOS_APP_PROXY_PROBE] App launch will pass ${IOS_E2E_APP_PROXY_LAUNCH_ARG}=${mockServerPort}. Search simulator logs for E2E_IOS_APP_PROXY_ENABLED and MockServer logs for E2E_DEVICE_PROXY_DIRECT_REQUEST after app launch.`,
      );
    }
  }

  return proxyState;
}

async function cleanupIosSimulatorProxy(
  proxyState: IosSimulatorProxyState | null,
): Promise<void> {
  if (!proxyState) {
    return;
  }

  for (const proxyFileState of proxyState) {
    if (
      proxyFileState.hadExistingPreferences &&
      (await fileExists(proxyFileState.backupPath))
    ) {
      await copyFile(proxyFileState.backupPath, proxyFileState.preferencesPath);
      await rm(proxyFileState.backupPath, { force: true });
    } else {
      await rm(proxyFileState.preferencesPath, { force: true });
      await rm(proxyFileState.backupPath, { force: true });
    }
  }

  await refreshIosSimulatorProxyPreferences(getIosSimulatorUdid());
}

/**
 * Handles the dapps by starting the servers and listening to the ports.
 * @param dapps - The dapps to start.
 * @param dappServer - The dapp server to start.
 */
async function handleDapps(
  dapps: DappOptions[],
  dappServer: DappServer[],
): Promise<void> {
  logger.debug(
    `Starting dapps: ${dapps.map((dapp) => dapp.dappVariant).join(', ')}`,
  );
  for (let i = 0; i < dapps.length; i++) {
    const dapp = dapps[i];
    switch (dapp.dappVariant) {
      case DappVariants.TEST_DAPP:
        dappServer.push(
          new DappServer({
            dappCounter: i,
            rootDirectory:
              dapp.dappPath || TestDapps[DappVariants.TEST_DAPP].dappPath,
            dappVariant: DappVariants.TEST_DAPP,
          }),
        );
        break;
      case DappVariants.MULTICHAIN_TEST_DAPP:
        dappServer.push(
          new DappServer({
            dappCounter: i,
            rootDirectory:
              dapp.dappPath ||
              TestDapps[DappVariants.MULTICHAIN_TEST_DAPP].dappPath,
            dappVariant: DappVariants.MULTICHAIN_TEST_DAPP,
          }),
        );
        break;
      case DappVariants.SOLANA_TEST_DAPP:
        dappServer.push(
          new DappServer({
            dappCounter: i,
            rootDirectory:
              dapp.dappPath ||
              TestDapps[DappVariants.SOLANA_TEST_DAPP].dappPath,
            dappVariant: DappVariants.SOLANA_TEST_DAPP,
          }),
        );
        break;
      case DappVariants.BROWSER_PLAYGROUND:
        dappServer.push(
          new DappServer({
            dappCounter: i,
            rootDirectory:
              dapp.dappPath ||
              TestDapps[DappVariants.BROWSER_PLAYGROUND].dappPath,
            dappVariant: DappVariants.BROWSER_PLAYGROUND,
          }),
        );
        break;
      default:
        throw new Error(
          `Unsupported dapp variant: '${dapp.dappVariant}'. Cannot start the server.`,
        );
    }

    // Dapp servers use multi-instance allocation since we can have multiple dapp servers
    const instanceId = `dapp-server-${i}`;
    await startMultiInstanceResourceWithRetry(
      ResourceType.DAPP_SERVER,
      instanceId,
      dappServer[i],
    );
  }
}

/**
 * Handles the smart contracts by deploying them to the local node.
 * @param smartContracts - The smart contracts to deploy.
 * @param localNodeConfig - The local node configuration.
 * @param localNode - The local node to deploy the smart contracts to.
 * @returns The contract registry.
 */
async function handleSmartContracts(
  smartContracts: string[],
  localNodeConfig: LocalNodeConfig,
  localNode: LocalNode,
): Promise<ContractAddressRegistry | undefined> {
  logger.debug(`Deploying smart contracts: ${smartContracts.join(', ')}`);
  let seeder;
  let contractRegistry;
  if (smartContracts && smartContracts.length > 0) {
    switch (localNodeConfig.type) {
      case LocalNodeType.anvil:
        seeder = new AnvilSeeder(localNode.getProvider());
        break;

      case LocalNodeType.ganache:
        seeder = new GanacheSeeder(localNode.getProvider());
        break;

      default:
        throw new Error(
          `Unsupported localNode: '${localNode}'. Cannot deploy smart contracts.`,
        );
    }

    for (const contract of smartContracts) {
      await seeder.deploySmartContract(
        contract,
        localNodeConfig.options.hardfork as string,
      );
    }

    contractRegistry = seeder.getContractRegistry();
  }
  return contractRegistry;
}

/**
 * Handles the local nodes by starting the servers and listening to the ports.
 * @param localNodeOptions - The local node options to use for the test.
 * @returns The local nodes.
 */
async function handleLocalNodes(
  localNodeOptions: LocalNodeOptionsInput,
): Promise<LocalNode[]> {
  logger.debug(
    `Starting local nodes: ${localNodeOptions
      .map((node) => node.type)
      .join(', ')}`,
  );
  try {
    let localNode;
    let localNodeSpecificOptions;
    const localNodes = [];
    for (const node of localNodeOptions) {
      const nodeType = node.type;
      const nodeOptions = node.options || {};

      switch (nodeType) {
        case LocalNodeType.anvil:
          localNode = new AnvilManager();
          localNodeSpecificOptions = nodeOptions as AnvilNodeOptions;

          // Set start options before starting
          localNode.setStartOptions(localNodeSpecificOptions);
          await startResourceWithRetry(ResourceType.ANVIL, localNode);
          localNodes.push(localNode);
          break;

        case LocalNodeType.ganache:
          localNode = new Ganache();
          localNodeSpecificOptions = nodeOptions as GanacheNodeOptions;
          // Check if mnemonic and/or hardfork are provided, otherwise use defaultGanacheOptions
          if (
            (!localNodeSpecificOptions?.mnemonic &&
              !localNodeSpecificOptions?.hardfork) ||
            Object.keys(localNodeSpecificOptions).length === 0
          ) {
            Object.assign(localNodeSpecificOptions, {
              ...defaultGanacheOptions,
              ...localNodeSpecificOptions,
            });
          } else {
            if (!localNodeSpecificOptions?.mnemonic) {
              localNodeSpecificOptions.mnemonic =
                defaultGanacheOptions.mnemonic;
            }
            if (!localNodeSpecificOptions?.hardfork) {
              localNodeSpecificOptions.hardfork =
                defaultGanacheOptions.hardfork;
            }
          }

          // Set start options before starting
          localNode.setStartOptions(localNodeSpecificOptions);
          await startResourceWithRetry(ResourceType.GANACHE, localNode);
          localNodes.push(localNode);
          break;
        case LocalNodeType.bitcoin:
          break;

        default:
          throw new Error(
            `Unsupported localNode: '${nodeType}'. Cannot start the server.`,
          );
      }
    }
    return localNodes;
  } catch (error) {
    logger.error('Error in handleLocalNodes:', error);
    throw error;
  }
}

/**
 * Handles the local nodes by stopping the servers and closing the ports.
 * @param localNodes - The local nodes to stop.
 */
async function handleLocalNodeCleanup(localNodes: LocalNode[]): Promise<void> {
  logger.debug(
    `Stopping local nodes: ${localNodes
      .map((node) => node.constructor.name)
      .join(', ')}`,
  );
  for (const node of localNodes) {
    if (node) {
      await node.stop();
    }
  }
}

/**
 * Handles the dapps by stopping the servers and closing the ports.
 * @param dapps - The dapps to stop.
 * @param dappServer - The dapp server to stop.
 */
async function handleDappCleanup(
  dapps: DappOptions[],
  dappServer: DappServer[],
): Promise<void> {
  logger.debug(
    `Stopping dapps: ${dapps.map((dapp) => dapp.dappVariant).join(', ')}`,
  );
  for (let i = 0; i < dapps.length; i++) {
    await dappServer[i].stop();
  }
}

/**
 * Updates RPC URLs in the fixture to use actual allocated ports from PortManager.
 * This ensures that if Anvil/Ganache got a different port than the default,
 * the fixture will have the correct URL.
 *
 * @param state - The fixture state to update
 * @returns The updated fixture state
 */
function updateRpcUrlsWithAllocatedPorts(state: Fixture): Fixture {
  const portManager = PortManager.getInstance();

  const actualAnvilPort = portManager.getPort(ResourceType.ANVIL);
  const actualGanachePort = portManager.getPort(ResourceType.GANACHE);

  const networkConfigs =
    state.state?.engine?.backgroundState?.NetworkController
      ?.networkConfigurationsByChainId;
  if (networkConfigs) {
    for (const chainId of Object.keys(networkConfigs)) {
      const config = networkConfigs[chainId as `0x${string}`];
      if (config.rpcEndpoints) {
        for (const endpoint of config.rpcEndpoints) {
          if (endpoint.url) {
            if (actualAnvilPort !== undefined) {
              endpoint.url = endpoint.url.replace(
                new RegExp(`:${DEFAULT_ANVIL_PORT}(\\/|$)`),
                `:${actualAnvilPort}$1`,
              );
            }
            if (actualGanachePort !== undefined) {
              endpoint.url = endpoint.url.replace(
                new RegExp(`:${DEFAULT_GANACHE_PORT}(\\/|$)`),
                `:${actualGanachePort}$1`,
              );
            }
          }
        }
      }
    }
  }

  return state;
}

/**
 * Updates dapp URLs in PermissionController with actual allocated ports by index.
 * Replaces all occurrences of dapp URLs (by index) with their actual allocated ports.
 */
function updateDappUrlsWithAllocatedPorts(state: Fixture): Fixture {
  const portManager = PortManager.getInstance();
  const permissionController =
    state.state?.engine?.backgroundState?.PermissionController;

  if (!permissionController?.subjects) {
    return state;
  }

  // Serialize subjects to JSON string for easy replacement
  let subjectsJson = JSON.stringify(permissionController.subjects);

  // Update each dapp URL by index
  let index = 0;
  while (true) {
    const actualPort = portManager.getMultiInstancePort(
      ResourceType.DAPP_SERVER,
      `dapp-server-${index}`,
    );
    if (actualPort === undefined) break;

    const fallbackPort = FALLBACK_DAPP_SERVER_PORT + index;
    const oldUrl = `localhost:${fallbackPort}`;
    const newUrl = `localhost:${actualPort}`;

    // Replace all occurrences
    subjectsJson = subjectsJson.split(oldUrl).join(newUrl);

    index++;
  }

  // Parse back and update
  permissionController.subjects = JSON.parse(subjectsJson);
  return state;
}

/**
 * Updates mock server URLs in fixture with actual allocated port.
 * Replaces all occurrences of localhost:8000 with the actual mock server port.
 * This affects browser tabs and RPC endpoints that proxy through mock server.
 */
function updateMockServerUrlsInFixture(state: Fixture): Fixture {
  const portManager = PortManager.getInstance();
  const actualPort = portManager.getPort(ResourceType.MOCK_SERVER);

  // Serialize entire fixture to JSON for easy replacement
  let fixtureJson = JSON.stringify(state);

  // Replace all mock server URLs
  const oldUrl = `localhost:${FALLBACK_MOCKSERVER_PORT}`;
  const newUrl = `localhost:${actualPort}`;

  fixtureJson = fixtureJson.split(oldUrl).join(newUrl);

  // Parse back and return
  return JSON.parse(fixtureJson);
}

/**
 * Loads a fixture into the fixture server.
 *
 * @param fixtureServer - An instance of the FixtureServer class responsible for loading fixtures.
 * @param options - An object containing the fixture to load.
 * @param options.fixture - The fixture data to load. If not provided, a default fixture is created.
 */
export const loadFixture = async (
  fixtureServer: FixtureServer,
  { fixture }: { fixture: FixtureBuilder | Fixture },
) => {
  // Normalize FixtureBuilder → Fixture; fall back to onboarding fixture if nothing provided.
  let state: Fixture =
    fixture instanceof FixtureBuilder
      ? fixture.build()
      : (fixture ?? new FixtureBuilder({ onboarding: true }).build());

  // Update RPC URLs with actual allocated ports from PortManager
  state = updateRpcUrlsWithAllocatedPorts(state);

  // Update dapp URLs and mock server URLs with actual allocated ports (iOS only)
  // On Android, fixture uses fallback ports which are mapped via adb reverse
  if (await PlatformDetector.isIOS()) {
    state = updateDappUrlsWithAllocatedPorts(state);
    state = updateMockServerUrlsInFixture(state);
  }

  fixtureServer.loadJsonState(state, null);
  // Checks if state is loaded
  logger.debug(
    `Loading fixture into fixture server: ${fixtureServer.getServerUrl}`,
  );
  const response = await axios.get(fixtureServer.getServerUrl);

  // Throws if state is not properly loaded
  if (response.status !== 200) {
    logger.error('Not able to load fixtures');
    throw new Error('Not able to load fixtures');
  }
};

export const createMockAPIServer = async (
  testSpecificMock?: TestSpecificMock,
): Promise<{
  mockServerInstance: MockServerE2E;
  mockServerPort: number;
}> => {
  const mockServerInstance = new MockServerE2E({
    events: DEFAULT_MOCKS,
    testSpecificMock,
  });

  const mockServerPort = await startResourceWithRetry(
    ResourceType.MOCK_SERVER,
    mockServerInstance,
  );

  const mockServer = mockServerInstance.server;

  if (testSpecificMock) {
    logger.debug(
      `Mock server started with testSpecificMock (priority) + defaults fallback on port ${mockServerPort}`,
    );
  } else {
    logger.debug(`Mock server started with defaults on port ${mockServerPort}`);
  }

  // Additional Global Mocks
  await mockNotificationServices(mockServer);

  // Feature Flags — use lower priority so testSpecificMock overrides take precedence
  await setupRemoteFeatureFlagsMock(mockServer, {}, 998);

  const endpoints = await mockServer.getMockedEndpoints();
  logger.debug(`Mocked endpoints: ${endpoints.length}`);

  return {
    mockServerInstance,
    mockServerPort,
  };
};

/**
 * Executes a test suite with fixtures by setting up a fixture server, loading a specified fixture,
 * and running the test suite. After the test suite execution, it stops the fixture server.
 *
 * @param options - The specific options for the test suite to run with.
 * @param testSuite - The test suite function to execute after setting up the fixture.
 */
export async function withFixtures(
  options: WithFixturesOptions,
  testSuite: TestSuiteFunction,
) {
  const {
    fixture: fixtureOption,
    restartDevice = false,
    smartContracts,
    disableLocalNodes = false,
    dapps,
    localNodeOptions = [
      {
        type: LocalNodeType.anvil,
        options: {
          hardfork: 'prague' as Hardfork,
        },
      },
    ],
    testSpecificMock,
    launchArgs,
    languageAndLocale,
    permissions = {},
    endTestfn,
    skipReactNativeReload = false,
    useCommandQueueServer = false,
    analyticsExpectations,
    currentDeviceDetails,
    disableSynchronization = false,
  } = options;
  const deviceCommands =
    currentDeviceDetails && !currentDeviceDetails.isBrowserstack
      ? new DeviceCommandHandler({ currentDeviceDetails, logger })
      : undefined;

  // Clean up any stale port forwarding from previous failed tests
  // This ensures we start with a clean slate on Android
  await cleanupAllAndroidPortForwarding();

  // Prepare android devices for testing to avoid having this in all tests
  await TestHelpers.reverseServerPort();

  // ========== RESOURCE STARTUP ORDER (IMPORTANT!) ==========
  // Resources must be started in this specific order to ensure ports are allocated
  // before they're referenced by subsequent resources, especially in testSpecificMock.
  //
  // 1. Local nodes (Anvil/Ganache) - Foundation for contracts and fixtures
  // 2. Smart contracts - Deploy to local nodes
  // 3. Dapp servers - May reference contract addresses
  // 4. Mock server - testSpecificMock can reference all above (dapps, nodes, contracts)
  // 5. Fixture server - Loads state with proper port mappings
  //
  // WHY: testSpecificMock runs during MockServer.start() and may call:
  // - getTestDappLocalUrl() / getDappUrl() - needs dapp ports allocated (iOS)
  // - getGanachePort() / AnvilPort() - needs node ports allocated
  // - Contract addresses from contractRegistry
  // ==========================================================

  // Initialize resource references for cleanup
  let localNodes;
  let contractRegistry;
  const dappServer: DappServer[] = [];
  let mockServerInstance;
  let mockServerPort;
  const fixtureServer = new FixtureServer();
  const commandQueueServer = new CommandQueueServer();
  const accountActivityWsServer = new LocalWebSocketServer(
    'accountActivity',
    ResourceType.ACCOUNT_ACTIVITY_WS,
  );
  const solanaInfuraWsServer = new LocalWebSocketServer(
    'solanaInfura',
    ResourceType.SOLANA_INFURA_WS,
  );
  let testError: Error | null = null;
  let iosSimulatorProxyState: IosSimulatorProxyState | null = null;
  let macosSystemProxyState: MacosSystemProxyState | null = null;
  let iosPfTransparentProxyState: IosPfTransparentProxyState | null = null;

  try {
    // Step 1: Start local nodes (Anvil/Ganache)
    if (!disableLocalNodes) {
      localNodes = await handleLocalNodes(localNodeOptions);
    }

    // Step 2: Deploy smart contracts (needs local nodes running)
    if (
      smartContracts &&
      smartContracts.length > 0 &&
      localNodes &&
      localNodes.length > 0
    ) {
      // We default the smart contract seeder to the first node client
      // If there's a future need to deploy multiple smart contracts in multiple clients
      // this assumption is no longer correct and the below code needs to be modified accordingly
      contractRegistry = await handleSmartContracts(
        smartContracts,
        localNodeOptions[0],
        localNodes[0],
      );
    }

    // Step 3: Start dapp servers (may reference contract addresses)
    if (dapps && dapps.length > 0) {
      await handleDapps(dapps, dappServer);
    }

    // Step 4: Start mock server (testSpecificMock can reference everything above)
    const mockServerResult = await createMockAPIServer(testSpecificMock);
    mockServerInstance = mockServerResult.mockServerInstance;
    mockServerPort = mockServerResult.mockServerPort;
    await updateIosProxyMobileconfigPort(mockServerPort);
    macosSystemProxyState = await configureMacosSystemProxy(mockServerPort);
    iosPfTransparentProxyState =
      await configureIosPfTransparentProxy(mockServerPort);
    iosSimulatorProxyState = await configureIosSimulatorProxy(
      mockServerPort,
      restartDevice,
    );

    // Step 4.5: Start WebSocket mock servers
    await startResourceWithRetry(
      ResourceType.ACCOUNT_ACTIVITY_WS,
      accountActivityWsServer,
    );
    await setupAccountActivityMocks(accountActivityWsServer);
    await startResourceWithRetry(
      ResourceType.SOLANA_INFURA_WS,
      solanaInfuraWsServer,
    );
    await setupSolanaInfuraMocks(solanaInfuraWsServer);
    // Resolve fixture after local nodes are started so dynamic ports are known
    let resolvedFixture: FixtureBuilder | Fixture;
    if (typeof fixtureOption === 'function') {
      resolvedFixture = await fixtureOption({ localNodes });
    } else {
      resolvedFixture = fixtureOption;
    }

    // Start fixture server
    await startResourceWithRetry(ResourceType.FIXTURE_SERVER, fixtureServer);
    await loadFixture(fixtureServer, { fixture: resolvedFixture });
    logger.debug(
      'The fixture server is started, and the initial state is successfully loaded.',
    );

    if (useCommandQueueServer) {
      await startResourceWithRetry(
        ResourceType.COMMAND_QUEUE_SERVER,
        commandQueueServer,
      );
    }
    // Due to the fact that the app was already launched on `init.js`, it is necessary to
    // launch into a fresh installation of the app to apply the new fixture loaded perviously.

    if (restartDevice) {
      // On Android, LaunchArguments library integration is unreliable on CI
      // We must pass fallback ports so the app uses them and adb reverse can map them
      // to the actual allocated ports
      const isAndroid = await PlatformDetector.isAndroid();
      const framework = FrameworkDetector.isDetox() ? 'Detox' : 'Appium';

      if (framework === 'Detox') {
        await TestHelpers.launchApp({
          delete: true,
          launchArgs: {
            fixtureServerPort: isAndroid
              ? `${FALLBACK_FIXTURE_SERVER_PORT}`
              : `${getFixturesServerPort()}`,
            commandQueueServerPort: isAndroid
              ? `${FALLBACK_COMMAND_QUEUE_SERVER_PORT}`
              : `${commandQueueServer.getServerPort()}`,
            detoxURLBlacklistRegex: Utilities.BlacklistURLs,
            mockServerPort: isAndroid
              ? `${FALLBACK_MOCKSERVER_PORT}`
              : `${mockServerPort}`,
            [ACCOUNT_ACTIVITY_WS.launchArgKey]: isAndroid
              ? `${ACCOUNT_ACTIVITY_WS.fallbackPort}`
              : `${accountActivityWsServer.getServerPort()}`,
            ...(launchArgs || {}),
          },
          languageAndLocale,
          permissions,
        });
      } else if (framework === 'Appium') {
        if (!currentDeviceDetails) {
          throw new Error('currentDeviceDetails is not available');
        }
        const testArgs = {
          fixtureServerPort: isAndroid
            ? `${FALLBACK_FIXTURE_SERVER_PORT}`
            : `${getFixturesServerPort()}`,
          commandQueueServerPort: isAndroid
            ? `${FALLBACK_COMMAND_QUEUE_SERVER_PORT}`
            : `${commandQueueServer.getServerPort()}`,
          detoxURLBlacklistRegex: Utilities.BlacklistURLs,
          mockServerPort: isAndroid
            ? `${FALLBACK_MOCKSERVER_PORT}`
            : `${mockServerPort}`,
          ...(isAndroid || !shouldUseIosAppProxyLaunchArg()
            ? {}
            : { [IOS_E2E_APP_PROXY_LAUNCH_ARG]: `${mockServerPort}` }),
          [ACCOUNT_ACTIVITY_WS.launchArgKey]: isAndroid
            ? `${ACCOUNT_ACTIVITY_WS.fallbackPort}`
            : `${accountActivityWsServer.getServerPort()}`,
          [SOLANA_INFURA_WS.launchArgKey]: isAndroid
            ? `${SOLANA_INFURA_WS.fallbackPort}`
            : `${solanaInfuraWsServer.getServerPort()}`,
          ...(launchArgs || {}),
        };

        if (deviceCommands) {
          await deviceCommands.clearAppData();
        }

        const appStateRequest = fixtureServer.waitForNextStateRequest();
        try {
          await PlaywrightUtilities.launchApp(currentDeviceDetails, {
            launchArgs: testArgs,
          });
          await appStateRequest;
        } catch (error) {
          appStateRequest.catch(() => undefined);
          throw error;
        }
      } else {
        throw new Error(`Unsupported test runner: ${framework}`);
      }
    }

    if (FrameworkDetector.isDetox()) {
      if (disableSynchronization) {
        await device.disableSynchronization();
      } else {
        await device.enableSynchronization();
      }
    }

    // Dismiss dev screens if running locally (not in CI)
    if (process.env.CI !== 'true') {
      if (FrameworkDetector.isDetox()) {
        await dismissDevScreens();
      } else if (FrameworkDetector.isAppium()) {
        await dismissDevScreensPlaywright();
      }
    }

    await testSuite({
      contractRegistry,
      mockServer: mockServerInstance.server,
      localNodes,
      commandQueueServer,
      deviceCommands,
    });
  } catch (error) {
    testError = error as Error;
    logger.error('Error in withFixtures:', error);
  } finally {
    const cleanupErrors: Error[] = [];

    if (endTestfn) {
      try {
        // Pass the mockServer to the endTestfn if it exists as we may want
        // to capture events before cleanup
        if (mockServerInstance) {
          await endTestfn({ mockServer: mockServerInstance.server });
        } else {
          await endTestfn({});
        }
      } catch (endTestError) {
        logger.error('Error in endTestfn:', endTestError);
        cleanupErrors.push(endTestError as Error);
      }
    }

    if (
      mockServerInstance &&
      shouldRunAnalyticsExpectations(analyticsExpectations)
    ) {
      logger.debug('Running analytics expectations');
      try {
        await runAnalyticsExpectations(
          mockServerInstance.server,
          analyticsExpectations,
        );
        logger.debug('Analytics expectations completed');
      } catch (analyticsError) {
        logger.error('Error in analyticsExpectations:', analyticsError);
        cleanupErrors.push(analyticsError as Error);
        logger.error('Analytics expectations failed');
      }
    }

    // Enter drain mode AFTER endTestfn / analyticsExpectations so analytics events are still captured,
    // but BEFORE stopping backends — prevents forwarding to dead Anvil/Ganache.
    if (mockServerInstance) {
      mockServerInstance.startDraining();
    }

    // Clean up all local nodes
    if (localNodes && localNodes.length > 0) {
      try {
        await handleLocalNodeCleanup(localNodes);
      } catch (cleanupError) {
        logger.error('Error during local node cleanup:', cleanupError);
        cleanupErrors.push(cleanupError as Error);
      }
    }

    if (dapps && dapps.length > 0) {
      try {
        await handleDappCleanup(dapps, dappServer);
      } catch (cleanupError) {
        logger.error('Error during dapp cleanup:', cleanupError);
        cleanupErrors.push(cleanupError as Error);
      }
    }

    // skipReactNativeReload needs to happen before killing the mock server to avoid race conditions
    if (!skipReactNativeReload && FrameworkDetector.isDetox()) {
      try {
        // Disable synchronization to prevent race conditions with pending timers
        await device.disableSynchronization();
        await device.reloadReactNative();
        await device.enableSynchronization();
      } catch (cleanupError) {
        logger.warn('React Native reload failed (non-critical):', cleanupError);
        // Ensure synchronization is re-enabled even on failure
        try {
          await device.enableSynchronization();
        } catch {
          // Ignore - best effort
        }
        // Don't add to cleanupErrors as this is a non-critical cleanup operation
      }
    }

    if (mockServerInstance) {
      try {
        // Validate live requests
        mockServerInstance.validateLiveRequests();
      } catch (cleanupError) {
        logger.error('Error during live request validation:', cleanupError);
        cleanupErrors.push(cleanupError as Error);
      }
    }

    // Clean up WebSocket servers
    try {
      resetAccountActivityMockState();
      await accountActivityWsServer.stop();
      await solanaInfuraWsServer.stop();
    } catch (cleanupError) {
      logger.error('Error during WebSocket cleanup:', cleanupError);
      cleanupErrors.push(cleanupError as Error);
    }

    if (macosSystemProxyState) {
      try {
        await cleanupMacosSystemProxy(macosSystemProxyState);
      } catch (cleanupError) {
        logger.error('Error during macOS system proxy cleanup:', cleanupError);
        cleanupErrors.push(cleanupError as Error);
      }
    }

    if (iosPfTransparentProxyState) {
      try {
        await cleanupIosPfTransparentProxy(iosPfTransparentProxyState);
      } catch (cleanupError) {
        logger.error(
          'Error during iOS pf transparent proxy cleanup:',
          cleanupError,
        );
        cleanupErrors.push(cleanupError as Error);
      }
    }

    // Clean up the mock server
    if (mockServerInstance?.isStarted()) {
      try {
        await mockServerInstance.stop();
      } catch (cleanupError) {
        logger.error('Error during mock server cleanup:', cleanupError);
        cleanupErrors.push(cleanupError as Error);
      }
    }

    if (iosSimulatorProxyState) {
      try {
        await cleanupIosSimulatorProxy(iosSimulatorProxyState);
      } catch (cleanupError) {
        logger.error('Error during iOS simulator proxy cleanup:', cleanupError);
        cleanupErrors.push(cleanupError as Error);
      }
    }

    // Clean up the fixture server
    if (fixtureServer?.isStarted()) {
      try {
        await fixtureServer.stop();
      } catch (cleanupError) {
        logger.error('Error during fixture server cleanup:', cleanupError);
        cleanupErrors.push(cleanupError as Error);
      }
    }

    // Clean up the command queue server
    if (useCommandQueueServer) {
      if (commandQueueServer?.isStarted()) {
        try {
          await commandQueueServer.stop();
        } catch (cleanupError) {
          logger.error(
            'Error during command queue server cleanup:',
            cleanupError,
          );
          cleanupErrors.push(cleanupError as Error);
        }
      }
    }

    // Remove the abort filter AFTER all cleanup is complete so late async
    // "Aborted" rejections from destroyed sockets are still caught.
    // removeAbortFilter() is async — it holds the filter active for an extra
    // 500ms before restoring Jest's handlers to cover abort events that fire
    // after all cleanup has completed (observed up to ~200ms on loaded CI).
    if (mockServerInstance) {
      logger.info('Removing abort filter after full cleanup');
      await mockServerInstance.removeAbortFilter();
    }

    // Handle error reporting: prioritize test error over cleanup errors
    if (testError && cleanupErrors.length > 0) {
      // Both test and cleanup failed - report both but throw the test error
      const cleanupErrorMessages = cleanupErrors
        .map((err, index) => `${index + 1}. ${err.message}`)
        .join('\n');
      logger.error(
        `Test failed AND cleanup failed with ${cleanupErrors.length} error(s):\n${cleanupErrorMessages}`,
      );
      throw testError; // Preserve original test failure
    } else if (testError) {
      // Only test failed - normal case
      throw testError;
    } else if (cleanupErrors.length > 0) {
      // Only cleanup failed - throw cleanup error
      const errorMessages = cleanupErrors
        .map((err, index) => `${index + 1}. ${err.message}`)
        .join('\n');
      const errorMessage = `Test cleanup failed with ${cleanupErrors.length} error(s):\n${errorMessages}`;
      throw new Error(errorMessage);
    }
    // No errors - test passed successfully
  }
}
