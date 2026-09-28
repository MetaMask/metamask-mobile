import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import {
  checkAnalyticsContract,
  type ContractCheckResult,
} from './check-contract';
import { verifyMobileContract } from './contract';
import { QUICK_BUY_AMOUNT_SELECTED_PILOT } from './quick-buy-pilot';
import {
  readTypewriterOutput,
  writeTypewriterFixture,
} from './typewriter-comparison';

const DEFAULT_LOCK_FILE = join(
  process.cwd(),
  'scripts',
  'analytics',
  'typed-events',
  'contract.lock.json',
);
const DEFAULT_OUTPUT_DIRECTORY = join(
  process.cwd(),
  'temp',
  'analytics-contract-comparison',
);

interface ComparisonOptions {
  readonly lockFilePath: string;
  readonly outputDirectory: string;
}

interface GeneratorComparisonReport {
  readonly contract: {
    readonly contractHash: string;
    readonly releaseTag: string;
    readonly sourceSha: string;
  };
  readonly event: {
    readonly name: string;
    readonly versions: readonly number[];
  };
  readonly narrowGenerator: {
    readonly exactPropertyCheck: boolean;
    readonly eventVersionContext: boolean;
    readonly sourcePath: string;
    readonly typeTestsPath: string;
  };
  readonly typewriter: {
    readonly deprecationAnnotationsFound: boolean;
    readonly eventVersionContextGenerated: boolean;
    readonly generatedFiles: readonly string[];
    readonly generatedSourceBytes: number;
    readonly eventNameFound: boolean;
    readonly permissiveIndexSignature: boolean;
    readonly expectedRetainedVersions: readonly number[];
    readonly progressiveBuilderApiFound: boolean;
    readonly sdk: 'analytics-react-native';
  };
  readonly limitations: readonly string[];
}

const readOptions = (args: readonly string[]): ComparisonOptions => {
  const options = new Map<string, string>();

  for (let index = 0; index < args.length; index++) {
    const argument = args[index];

    if (!argument?.startsWith('--')) {
      throw new Error(`Unexpected argument '${argument ?? ''}'`);
    }

    const value = args[index + 1];

    if (!value || value.startsWith('--')) {
      throw new Error(`Missing value for '${argument}'`);
    }

    options.set(argument.slice(2), value);
    index++;
  }

  return {
    lockFilePath: options.get('lock-file') ?? DEFAULT_LOCK_FILE,
    outputDirectory: options.get('output-directory') ?? DEFAULT_OUTPUT_DIRECTORY,
  };
};

const toRelativePath = (filePath: string): string =>
  relative(process.cwd(), filePath);

const createReport = (
  checkResult: ContractCheckResult,
  outputDirectory: string,
  typewriterSource: string,
  typewriterFiles: readonly string[],
): GeneratorComparisonReport => {
  const versions = QUICK_BUY_AMOUNT_SELECTED_PILOT.versions.map(
    ({ version }) => version,
  );
  const latestVersion = Math.max(...versions);

  return {
    contract: {
      contractHash: checkResult.verification.contractHash,
      releaseTag: checkResult.release.tag,
      sourceSha: checkResult.verification.sourceSha,
    },
    event: {
      name: QUICK_BUY_AMOUNT_SELECTED_PILOT.eventName,
      versions,
    },
    narrowGenerator: {
      exactPropertyCheck: true,
      eventVersionContext: true,
      sourcePath: toRelativePath(
        join(outputDirectory, 'generated', 'QuickBuyAmountSelected.ts'),
      ),
      typeTestsPath: toRelativePath(
        join(outputDirectory, 'generated', 'QuickBuyAmountSelected.test-d.ts'),
      ),
    },
    typewriter: {
      deprecationAnnotationsFound: typewriterSource.includes('@deprecated'),
      eventVersionContextGenerated: typewriterSource.includes('event_version'),
      generatedFiles: typewriterFiles.map(toRelativePath),
      generatedSourceBytes: Buffer.byteLength(typewriterSource, 'utf8'),
      eventNameFound: typewriterSource.includes(
        QUICK_BUY_AMOUNT_SELECTED_PILOT.eventName,
      ),
      permissiveIndexSignature: typewriterSource.includes(
        '[property: string]: any;',
      ),
      expectedRetainedVersions: [latestVersion],
      progressiveBuilderApiFound:
        typewriterSource.includes('.create(') &&
        typewriterSource.includes('setProperties'),
      sdk: 'analytics-react-native',
    },
    limitations: [
      'Stock Typewriter filters the fixture to TRACK rules.',
      'Stock Typewriter retains only the highest version for one event key.',
      'The comparison does not treat Typewriter output as production code.',
      'Progressive event construction and runtime completeness remain follow-up API work.',
    ],
  };
};

const main = async (): Promise<void> => {
  const options = readOptions(process.argv.slice(2));

  mkdirSync(options.outputDirectory, { recursive: true });
  rmSync(join(options.outputDirectory, 'typewriter'), {
    force: true,
    recursive: true,
  });

  const checkResult = await checkAnalyticsContract({
    keep: true,
    lockFilePath: options.lockFilePath,
    outputDirectory: options.outputDirectory,
  });
  const workDirectory = checkResult.workDirectory;

  if (!workDirectory) {
    throw new Error('Expected retained contract artifacts for comparison');
  }

  const verifiedContract = verifyMobileContract({
    manifestPath: join(workDirectory, 'contract', 'manifest.json'),
    contractPath: join(workDirectory, 'contract', 'metamask-mobile.json'),
    expectedAssetSha256: checkResult.verification.assetSha256,
    eventName: QUICK_BUY_AMOUNT_SELECTED_PILOT.eventName,
    versions: QUICK_BUY_AMOUNT_SELECTED_PILOT.versions.map(
      ({ version }) => version,
    ),
  });
  const typewriterDirectory = join(workDirectory, 'typewriter');
  const typewriterFixture = writeTypewriterFixture(
    verifiedContract.contract,
    verifiedContract.eventRules,
    typewriterDirectory,
  );
  const yarnCommand = process.platform === 'win32' ? 'yarn.cmd' : 'yarn';

  execFileSync(
    yarnCommand,
    [
      'typewriter',
      'build',
      '--config',
      typewriterFixture.configPath,
      '--mode',
      'prod',
    ],
    {
      stdio: 'inherit',
    },
  );

  const typewriterOutput = readTypewriterOutput(
    typewriterFixture.generatedDirectory,
  );
  const report = createReport(
    checkResult,
    workDirectory,
    typewriterOutput.source,
    typewriterOutput.files,
  );
  const reportPath = join(workDirectory, 'comparison.json');

  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ ...report, reportPath }, null, 2));
};

if (process.argv[1]?.endsWith('compare-generators.ts')) {
  main().catch((error: unknown) => {
    console.error(String(error));
    process.exitCode = 1;
  });
}
