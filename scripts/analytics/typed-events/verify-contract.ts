import {
  verifyMobileContract,
  type VerifiedMobileContract,
} from './contract';

const readOptions = (
  args: readonly string[],
): ReadonlyMap<string, string> => {
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

  return options;
};

const readRequiredOption = (
  options: ReadonlyMap<string, string>,
  name: string,
): string => {
  const value = options.get(name);

  if (!value) {
    throw new Error(`Missing required option '--${name}'`);
  }

  return value;
};

const readVersions = (value: string | undefined): readonly number[] => {
  if (!value) {
    return [1, 2];
  }

  const versions = value.split(',').map((version) => Number(version));

  if (
    versions.some(
      (version) => !Number.isInteger(version) || version < 1,
    )
  ) {
    throw new Error(
      `Expected comma-separated positive integer versions, got '${value}'`,
    );
  }

  return versions;
};

const summarize = (
  result: VerifiedMobileContract,
): Record<string, unknown> => ({
  sourceSha: result.manifest.sourceSha,
  trackingPlanId: result.contract.trackingPlan.id,
  ruleCount: result.contract.ruleCount,
  contractHash: result.contract.hash,
  assetSha256: result.assetSha256,
  event: {
    name: result.eventRules[0]?.key,
    versions: result.eventRules.map((rule) => rule.version),
  },
});

const main = (): void => {
  const options = readOptions(process.argv.slice(2));
  const result = verifyMobileContract({
    manifestPath: readRequiredOption(options, 'manifest'),
    contractPath: readRequiredOption(options, 'contract'),
    expectedAssetSha256: options.get('asset-sha256'),
    eventName: options.get('event'),
    versions: readVersions(options.get('versions')),
  });

  console.log(JSON.stringify(summarize(result), null, 2));
};

if (process.argv[1]?.endsWith('verify-contract.ts')) {
  try {
    main();
  } catch (error) {
    console.error(String(error));
    process.exitCode = 1;
  }
}
