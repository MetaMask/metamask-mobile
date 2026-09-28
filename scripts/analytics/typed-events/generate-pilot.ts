import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { format } from 'prettier';
import { verifyMobileContract } from './contract';
import { generateEventPilot } from './generator';
import { QUICK_BUY_AMOUNT_SELECTED_PILOT } from './quick-buy-pilot';

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

const main = async (): Promise<void> => {
  const options = readOptions(process.argv.slice(2));
  const outputDirectory = readRequiredOption(options, 'output-directory');
  const pilot = QUICK_BUY_AMOUNT_SELECTED_PILOT;
  const verifiedContract = verifyMobileContract({
    manifestPath: readRequiredOption(options, 'manifest'),
    contractPath: readRequiredOption(options, 'contract'),
    expectedAssetSha256: readRequiredOption(options, 'asset-sha256'),
    eventName: pilot.eventName,
    versions: pilot.versions.map(({ version }) => version),
  });
  const generated = generateEventPilot(verifiedContract.eventRules, pilot);
  const sourcePath = join(outputDirectory, `${pilot.exportName}.ts`);
  const typeTestsPath = join(
    outputDirectory,
    `${pilot.exportName}.test-d.ts`,
  );

  mkdirSync(outputDirectory, { recursive: true });
  writeFileSync(
    sourcePath,
    await format(generated.source, {
      parser: 'typescript',
      singleQuote: true,
    }),
  );
  writeFileSync(
    typeTestsPath,
    await format(generated.typeTests, {
      parser: 'typescript',
      singleQuote: true,
    }),
  );

  console.log(
    JSON.stringify(
      {
        event: pilot.eventName,
        versions: pilot.versions.map(({ version }) => version),
        sourcePath,
        typeTestsPath,
      },
      null,
      2,
    ),
  );
};

if (process.argv[1]?.endsWith('generate-pilot.ts')) {
  main().catch((error: unknown) => {
    console.error(String(error));
    process.exitCode = 1;
  });
}
