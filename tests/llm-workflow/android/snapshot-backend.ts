/* eslint-disable import-x/no-nodejs-modules */
import { readFileSync } from 'node:fs';
import { findPackageJSON } from 'node:module';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

import type {
  DeviceBackend,
  SnapshotResult,
  UIElement,
} from '@metamask/device-mcp';
import type {
  captureAndroidSnapshotWithHelper,
  ensureAndroidSnapshotHelper,
  parseAndroidSnapshotHelperManifest,
  parseAndroidSnapshotHelperXml,
  AndroidAdbExecutor,
  AndroidSnapshotHelperArtifact,
} from 'agent-device/android-snapshot-helper';

import { createAndroidSnapshotAdbExecutor } from './snapshot-helper-adb';

const HELPER_COMMAND_TIMEOUT_MS = 15_000;
const HELPER_CAPTURE_TIMEOUT_MS = 8_000;
const HELPER_CAPTURE_MAX_NODES = 5_000;

interface AndroidSnapshotHelperApi {
  captureAndroidSnapshotWithHelper: typeof captureAndroidSnapshotWithHelper;
  ensureAndroidSnapshotHelper: typeof ensureAndroidSnapshotHelper;
  parseAndroidSnapshotHelperManifest: typeof parseAndroidSnapshotHelperManifest;
  parseAndroidSnapshotHelperXml: typeof parseAndroidSnapshotHelperXml;
}

// Preserve native import() when this CommonJS tool is transformed by Jest.
// eslint-disable-next-line no-new-func
const nativeImport = Function(
  'specifier',
  'return import(specifier);',
) as (specifier: string) => Promise<AndroidSnapshotHelperApi>;

let helperApiPromise: Promise<AndroidSnapshotHelperApi> | undefined;

export interface SnapshotBackendOptions {
  readonly adb?: AndroidAdbExecutor;
  readonly artifact?: AndroidSnapshotHelperArtifact;
  readonly helperApi?: AndroidSnapshotHelperApi;
  readonly now?: () => number;
}

export function wrapAndroidSnapshotBackend(
  backend: DeviceBackend,
  serial: string,
  options: SnapshotBackendOptions = {},
): DeviceBackend {
  const adb = options.adb ?? createAndroidSnapshotAdbExecutor(serial);
  const now = options.now ?? Date.now;
  let snapshotQueue: Promise<void> = Promise.resolve();

  async function captureSnapshot(): Promise<SnapshotResult> {
    const helperApi = options.helperApi ?? (await loadAndroidSnapshotHelper());
    const artifact =
      options.artifact ??
      resolveBundledHelperArtifact(helperApi.parseAndroidSnapshotHelperManifest);
    await helperApi.ensureAndroidSnapshotHelper({
      adb,
      artifact,
      deviceKey: serial,
      installPolicy: 'missing-or-outdated',
      timeoutMs: HELPER_COMMAND_TIMEOUT_MS,
    });
    const output = await helperApi.captureAndroidSnapshotWithHelper({
      adb,
      packageName: artifact.manifest.packageName,
      instrumentationRunner: artifact.manifest.instrumentationRunner,
      timeoutMs: HELPER_CAPTURE_TIMEOUT_MS,
      commandTimeoutMs: HELPER_COMMAND_TIMEOUT_MS,
    });
    const parsed = helperApi.parseAndroidSnapshotHelperXml(
      output.xml,
      output.metadata,
      { raw: true },
      getCaptureMaxNodes(output.metadata),
    );
    return {
      platform: 'android',
      hierarchy: buildHierarchy(parsed.nodes, output.xml),
      raw: output.xml,
      timestamp: now(),
    };
  }

  function snapshot(): Promise<SnapshotResult> {
    const capture = snapshotQueue.then(captureSnapshot, captureSnapshot);
    snapshotQueue = capture.then(
      () => undefined,
      () => undefined,
    );
    return capture;
  }

  // The upstream ADB backend calls this.snapshot() from element operations.
  // Replace the method on that object so both direct and internal captures use
  // the helper instead of the idle-gated raw UiAutomator dump implementation.
  backend.snapshot = snapshot;
  return backend;
}

async function loadAndroidSnapshotHelper(): Promise<AndroidSnapshotHelperApi> {
  const runtimeModulePath = join(
    resolveAgentDevicePackageRoot(),
    'dist',
    'src',
    'android-snapshot-helper.js',
  );
  helperApiPromise ??= nativeImport(pathToFileURL(runtimeModulePath).href);
  return await helperApiPromise;
}

function resolveBundledHelperArtifact(
  parseManifest: typeof parseAndroidSnapshotHelperManifest,
): AndroidSnapshotHelperArtifact {
  const packageRoot = resolveAgentDevicePackageRoot();
  const packageJsonPath = join(packageRoot, 'package.json');
  const helperDirectory = join(
    packageRoot,
    'android-snapshot-helper',
    'dist',
  );
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as unknown;
  const packageVersion = getPackageVersion(packageJson);
  const manifestPath = join(
    helperDirectory,
    `agent-device-android-snapshot-helper-${packageVersion}.manifest.json`,
  );
  const manifest = parseManifest(
    JSON.parse(readFileSync(manifestPath, 'utf8')) as unknown,
  );
  if (!manifest.assetName) {
    throw new Error(
      `Android snapshot helper manifest has no assetName: ${manifestPath}`,
    );
  }
  return { manifest, apkPath: join(helperDirectory, manifest.assetName) };
}

function resolveAgentDevicePackageRoot(): string {
  const packageJsonPath = findPackageJSON('agent-device', __filename);
  if (!packageJsonPath) {
    throw new Error('Unable to locate the installed agent-device package');
  }
  return dirname(packageJsonPath);
}

function getPackageVersion(value: unknown): string {
  if (
    value &&
    typeof value === 'object' &&
    'version' in value &&
    typeof value.version === 'string'
  ) {
    return value.version;
  }
  throw new Error('Installed agent-device package has no valid version');
}

type ParsedNode = ReturnType<typeof parseAndroidSnapshotHelperXml>['nodes'][number];

interface LegacyNodeAttributes {
  readonly identifier?: string;
  readonly label?: string;
  readonly value?: string;
}

function getCaptureMaxNodes(metadata: unknown): number {
  if (
    metadata &&
    typeof metadata === 'object' &&
    'maxNodes' in metadata &&
    typeof metadata.maxNodes === 'number'
  ) {
    return metadata.maxNodes;
  }
  return HELPER_CAPTURE_MAX_NODES;
}

function buildHierarchy(nodes: ParsedNode[], xml: string): UIElement[] {
  const elements = new Map<number, UIElement>();
  const roots: UIElement[] = [];
  const legacyAttributes = parseLegacyNodeAttributes(xml);

  for (const node of nodes) {
    if (!node.rect) {
      continue;
    }
    const attributes = legacyAttributes[node.index];
    elements.set(node.index, {
      type: node.type ?? 'Unknown',
      label: attributes?.label,
      value: attributes?.value,
      identifier: attributes?.identifier,
      frame: node.rect,
      enabled: node.enabled !== false,
      children: [],
    });
  }

  for (const node of nodes) {
    const uiElement = elements.get(node.index);
    if (!uiElement) {
      continue;
    }
    const parent =
      node.parentIndex === undefined
        ? undefined
        : elements.get(node.parentIndex);
    if (parent) {
      parent.children?.push(uiElement);
    } else {
      roots.push(uiElement);
    }
  }

  return roots;
}

function parseLegacyNodeAttributes(xml: string): LegacyNodeAttributes[] {
  return [...xml.matchAll(/<node(?:\s[^>]*|\s*)>/gu)].map((nodeMatch) => {
    const get = (name: string): string | undefined =>
      nodeMatch[0].match(new RegExp(`${name}="([^"]*)"`, 'u'))?.[1] ||
      undefined;
    return {
      label: get('content-desc'),
      value: get('text'),
      identifier: get('resource-id'),
    };
  });
}
