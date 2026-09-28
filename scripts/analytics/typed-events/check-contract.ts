import { execFileSync } from 'node:child_process';
import {
  mkdtempSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { format } from 'prettier';
import {
  verifyMobileContract,
  type VerifiedMobileContract,
} from './contract';
import {
  assertContractMatchesLock,
  readContractLock,
  type ContractLock,
} from './contract-lock';
import { generateEventPilot } from './generator';
import { QUICK_BUY_AMOUNT_SELECTED_PILOT } from './quick-buy-pilot';

const CONTRACT_REPOSITORY = 'Consensys/segment-schema';
const ANALYTICS_RELEASE_PREFIX = 'analytics-contracts-';
const DEFAULT_LOCAL_OUTPUT_DIRECTORY = join(
  process.cwd(),
  'temp',
  'local-analytics-contract-check',
);
const log = (message: string): void => {
  console.error(`[analytics-contract] ${message}`);
};

interface ReleaseAsset {
  readonly digest: string | null;
  readonly name: string;
}

export interface AnalyticsContractRelease {
  readonly assets: readonly ReleaseAsset[];
  readonly publishedAt: string;
  readonly tag: string;
  readonly url: string;
}

export interface ContractCheckOptions {
  readonly assetSha256?: string;
  readonly contractPath?: string;
  readonly keep: boolean;
  readonly jsonOutput?: string;
  readonly lockFilePath?: string;
  readonly manifestPath?: string;
  readonly outputDirectory?: string;
  readonly releaseTag?: string;
  readonly releaseUrl?: string;
}

export interface ContractCheckResult {
  readonly generated: {
    readonly eventName: string;
    readonly versions: readonly number[];
  };
  readonly release: {
    readonly publishedAt: string;
    readonly tag: string;
    readonly url: string;
  };
  readonly verification: {
    readonly assetSha256: string;
    readonly contractHash: string;
    readonly ruleCount: number;
    readonly sourceSha: string;
    readonly trackingPlanId: string;
  };
  readonly workDirectory?: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const readString = (
  object: Record<string, unknown>,
  key: string,
  path: string,
): string => {
  const value = object[key];

  if (typeof value !== 'string') {
    throw new Error(`Expected string at ${path}.${key}`);
  }

  return value;
};

const readRelease = (value: unknown, path: string): AnalyticsContractRelease => {
  if (!isRecord(value)) {
    throw new Error(`Expected release object at ${path}`);
  }

  const assetsValue = value.assets;

  if (!Array.isArray(assetsValue)) {
    throw new Error(`Expected release assets array at ${path}.assets`);
  }

  const assets = assetsValue.map((asset, index) => {
    const assetPath = `${path}.assets[${index}]`;

    if (!isRecord(asset)) {
      throw new Error(`Expected release asset object at ${assetPath}`);
    }

    const digest = asset.digest;

    if (digest !== null && typeof digest !== 'string') {
      throw new Error(`Expected string or null at ${assetPath}.digest`);
    }

    return {
      digest,
      name: readString(asset, 'name', assetPath),
    };
  });

  return {
    assets,
    publishedAt: readString(value, 'published_at', path),
    tag: readString(value, 'tag_name', path),
    url: readString(value, 'html_url', path),
  };
};

const runGhJson = (args: readonly string[]): unknown => {
  const output = execFileSync('gh', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  });

  return JSON.parse(output) as unknown;
};

/**
 * Select the newest published analytics contract release.
 *
 * @param releases - Release metadata returned by GitHub.
 * @returns The newest analytics contract release.
 */
export const selectLatestAnalyticsRelease = (
  releases: readonly AnalyticsContractRelease[],
): AnalyticsContractRelease => {
  const candidates = releases
    .filter((release) => release.tag.startsWith(ANALYTICS_RELEASE_PREFIX))
    .toSorted(
      (left, right) =>
        Date.parse(right.publishedAt) - Date.parse(left.publishedAt),
    );
  const [latest] = candidates;

  if (!latest) {
    throw new Error(
      `No published releases with prefix '${ANALYTICS_RELEASE_PREFIX}' were found`,
    );
  }

  return latest;
};

/**
 * Flatten the paginated GitHub releases response produced by `gh api
 * --paginate --slurp`.
 *
 * @param value - GitHub API response pages.
 * @returns Release values from all pages.
 */
export const flattenReleasePages = (value: unknown): readonly unknown[] => {
  if (!Array.isArray(value)) {
    throw new Error('Expected GitHub releases response to be an array');
  }

  if (value.every((page) => Array.isArray(page))) {
    return value.flat();
  }

  return value;
};

const resolveRelease = (
  requestedTag: string | undefined,
): AnalyticsContractRelease => {
  if (requestedTag) {
    const releaseValue = runGhJson([
      'api',
      `repos/${CONTRACT_REPOSITORY}/releases/tags/${requestedTag}`,
    ]);

    if (!isRecord(releaseValue)) {
      throw new Error(`Expected release object for '${requestedTag}'`);
    }

    const release = readRelease(
      releaseValue,
      `release ${requestedTag}`,
    );

    if (!release.tag.startsWith(ANALYTICS_RELEASE_PREFIX)) {
      throw new Error(
        `Release ${release.tag} is not an analytics contract release`,
      );
    }

    if (releaseValue.draft !== false || releaseValue.prerelease !== false) {
      throw new Error(`Release ${release.tag} is not published`);
    }

    return release;
  }

  const releasesValue = runGhJson([
    'api',
    '--paginate',
    '--slurp',
    `repos/${CONTRACT_REPOSITORY}/releases?per_page=100`,
  ]);
  const releases = flattenReleasePages(releasesValue);

  const parsedReleases = releases
    .filter((release) => isRecord(release))
    .filter((release) => release.draft === false && release.prerelease === false)
    .map((release, index) => readRelease(release, `releases[${index}]`));

  return selectLatestAnalyticsRelease(parsedReleases);
};

const readAssetDigest = (release: AnalyticsContractRelease): string => {
  const asset = release.assets.find(
    ({ name }) => name === 'metamask-mobile.json',
  );

  if (!asset?.digest || !/^sha256:[0-9a-f]{64}$/u.test(asset.digest)) {
    throw new Error(
      `Release ${release.tag} has no valid metamask-mobile.json SHA-256 digest`,
    );
  }

  return asset.digest;
};

const downloadRelease = (
  release: AnalyticsContractRelease,
  directory: string,
): void => {
  mkdirSync(directory, { recursive: true });
  rmSync(join(directory, 'manifest.json'), { force: true });
  rmSync(join(directory, 'metamask-mobile.json'), { force: true });
  execFileSync(
    'gh',
    [
      'release',
      'download',
      release.tag,
      '--repo',
      CONTRACT_REPOSITORY,
      '--pattern',
      'manifest.json',
      '--pattern',
      'metamask-mobile.json',
      '--dir',
      directory,
    ],
    { stdio: 'inherit' },
  );
};

const writeGeneratedFiles = async (
  verifiedContract: VerifiedMobileContract,
  outputDirectory: string,
): Promise<void> => {
  const generated = generateEventPilot(
    verifiedContract.eventRules,
    QUICK_BUY_AMOUNT_SELECTED_PILOT,
  );

  mkdirSync(outputDirectory, { recursive: true });
  writeFileSync(
    join(outputDirectory, 'QuickBuyAmountSelected.ts'),
    await format(generated.source, {
      parser: 'typescript',
      singleQuote: true,
    }),
  );
  writeFileSync(
    join(outputDirectory, 'QuickBuyAmountSelected.test-d.ts'),
    await format(generated.typeTests, {
      parser: 'typescript',
      singleQuote: true,
    }),
  );
};

const typeCheckGeneratedFiles = (directory: string): void => {
  const yarnCommand = process.platform === 'win32' ? 'yarn.cmd' : 'yarn';

  execFileSync(
    yarnCommand,
    [
      'tsc',
      '--noEmit',
      '--skipLibCheck',
      '--target',
      'esnext',
      '--module',
      'preserve',
      '--moduleResolution',
      'bundler',
      '--strict',
      join(directory, 'QuickBuyAmountSelected.ts'),
      join(directory, 'QuickBuyAmountSelected.test-d.ts'),
    ],
    { stdio: 'inherit' },
  );
};

const readOptions = (args: readonly string[]): ContractCheckOptions => {
  const options = new Map<string, string | true>();

  for (let index = 0; index < args.length; index++) {
    const argument = args[index];

    if (!argument?.startsWith('--')) {
      throw new Error(`Unexpected argument '${argument ?? ''}'`);
    }

    if (argument === '--keep') {
      options.set('keep', true);
      continue;
    }

    const value = args[index + 1];

    if (!value || value.startsWith('--')) {
      throw new Error(`Missing value for '${argument}'`);
    }

    options.set(argument.slice(2), value);
    index++;
  }

  const outputDirectory = options.get('output-directory');
  const jsonOutput = options.get('json-output');
  const lockFilePath = options.get('lock-file');
  const assetSha256 = options.get('asset-sha256');
  const contractPath = options.get('contract');
  const manifestPath = options.get('manifest');
  const releaseTag = options.get('release-tag');
  const releaseUrl = options.get('release-url');

  const localInputs = [assetSha256, contractPath, manifestPath].filter(
    (value) => value !== undefined,
  );

  if (localInputs.length !== 0 && localInputs.length !== 3) {
    throw new Error(
      'The --manifest, --contract, and --asset-sha256 options must be provided together',
    );
  }

  return {
    assetSha256: typeof assetSha256 === 'string' ? assetSha256 : undefined,
    contractPath: typeof contractPath === 'string' ? contractPath : undefined,
    keep: options.get('keep') === true,
    jsonOutput: typeof jsonOutput === 'string' ? jsonOutput : undefined,
    lockFilePath:
      typeof lockFilePath === 'string' ? lockFilePath : undefined,
    manifestPath: typeof manifestPath === 'string' ? manifestPath : undefined,
    outputDirectory:
      typeof outputDirectory === 'string' ? outputDirectory : undefined,
    releaseTag: typeof releaseTag === 'string' ? releaseTag : undefined,
    releaseUrl: typeof releaseUrl === 'string' ? releaseUrl : undefined,
  };
};

/**
 * Download, verify, generate, and type-check the latest Mobile contract.
 *
 * @param options - Release selection and temporary-output options.
 * @returns A sanitized result suitable for CI summaries.
 */
export const checkAnalyticsContract = async (
  options: ContractCheckOptions,
): Promise<ContractCheckResult> => {
  const contractLock: ContractLock | undefined = options.lockFilePath
    ? readContractLock(options.lockFilePath)
    : undefined;
  const usesProvidedContract =
    options.manifestPath !== undefined &&
    options.contractPath !== undefined &&
    options.assetSha256 !== undefined;
  if (
    contractLock &&
    options.releaseTag !== undefined &&
    options.releaseTag !== contractLock.releaseTag
  ) {
    throw new Error(
      `Release tag '${options.releaseTag}' does not match contract lock release '${contractLock.releaseTag}'`,
    );
  }
  const requestedReleaseTag = options.releaseTag ?? contractLock?.releaseTag;
  const release = usesProvidedContract
    ? {
        assets: [],
        publishedAt: '',
        tag: requestedReleaseTag ?? 'local',
        url: options.releaseUrl ?? '',
      }
    : resolveRelease(requestedReleaseTag);
  const assetDigest = usesProvidedContract
    ? options.assetSha256
    : readAssetDigest(release);
  const workDirectory =
    options.outputDirectory ??
    (usesProvidedContract
      ? mkdtempSync(join(tmpdir(), 'metamask-mobile-analytics-'))
      : DEFAULT_LOCAL_OUTPUT_DIRECTORY);
  const contractDirectory = join(workDirectory, 'contract');
  const generatedDirectory = join(workDirectory, 'generated');
  const shouldKeepWorkDirectory =
    options.keep ||
    options.outputDirectory !== undefined ||
    !usesProvidedContract;

  try {
    if (contractLock) {
      log(
        `Using contract lock '${options.lockFilePath}' for release '${contractLock.releaseTag}'.`,
      );
    }

    if (usesProvidedContract) {
      log(
        `Using the contract downloaded by the shared action for release '${release.tag}'; skipping download.`,
      );
    } else {
      log(`Downloading analytics contract release '${release.tag}'.`);
      downloadRelease(release, contractDirectory);
    }

    if (
      contractLock &&
      assetDigest !== undefined &&
      assetDigest !== contractLock.assetSha256
    ) {
      throw new Error(
        `Contract lock mismatch for assetSha256: expected '${contractLock.assetSha256}', got '${assetDigest}'`,
      );
    }

    const verifiedContract = verifyMobileContract({
      manifestPath:
        options.manifestPath ?? join(contractDirectory, 'manifest.json'),
      contractPath:
        options.contractPath ?? join(contractDirectory, 'metamask-mobile.json'),
      expectedAssetSha256: assetDigest,
      eventName: QUICK_BUY_AMOUNT_SELECTED_PILOT.eventName,
      versions: QUICK_BUY_AMOUNT_SELECTED_PILOT.versions.map(
        ({ version }) => version,
      ),
    });

    if (contractLock) {
      assertContractMatchesLock(contractLock, {
        assetSha256: verifiedContract.assetSha256,
        contract: verifiedContract.contract,
        releaseTag: release.tag,
        releaseUrl: release.url,
      });
    }

    await writeGeneratedFiles(verifiedContract, generatedDirectory);
    typeCheckGeneratedFiles(generatedDirectory);

    const result: ContractCheckResult = {
      generated: {
        eventName: QUICK_BUY_AMOUNT_SELECTED_PILOT.eventName,
        versions: QUICK_BUY_AMOUNT_SELECTED_PILOT.versions.map(
          ({ version }) => version,
        ),
      },
      release: {
        publishedAt: release.publishedAt,
        tag: release.tag,
        url: release.url,
      },
      verification: {
        assetSha256: verifiedContract.assetSha256,
        contractHash: verifiedContract.contract.hash,
        ruleCount: verifiedContract.contract.ruleCount,
        sourceSha: verifiedContract.manifest.sourceSha,
        trackingPlanId: verifiedContract.contract.trackingPlan.id,
      },
      ...(shouldKeepWorkDirectory ? { workDirectory } : {}),
    };

    if (options.jsonOutput) {
      writeFileSync(options.jsonOutput, `${JSON.stringify(result, null, 2)}\n`);
    }

    if (shouldKeepWorkDirectory) {
      log(`Retained analytics contract artifacts at '${workDirectory}'.`);
    }

    return result;
  } finally {
    if (!shouldKeepWorkDirectory) {
      log('Cleaning temporary analytics contract artifacts.');
      rmSync(workDirectory, { recursive: true, force: true });
    }
  }
};

const main = async (): Promise<void> => {
  const result = await checkAnalyticsContract(readOptions(process.argv.slice(2)));
  console.log(JSON.stringify(result, null, 2));
};

if (process.argv[1]?.endsWith('check-contract.ts')) {
  main().catch((error: unknown) => {
    console.error(String(error));
    process.exitCode = 1;
  });
}
