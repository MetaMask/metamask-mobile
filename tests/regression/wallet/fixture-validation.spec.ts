// eslint-disable-next-line import/no-nodejs-modules, import/no-namespace
import * as fs from 'fs';
// eslint-disable-next-line import/no-namespace, import/no-nodejs-modules
import * as path from 'path';
import { RegressionWalletPlatform } from '../../tags';
import { CreateNewWallet } from '../../flows/wallet.flow';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { TestSuiteParams } from '../../framework/types';
import {
  readFixtureFile,
  computeSchemaDiff,
  hasSchemaDifferences,
  formatSchemaDiff,
  mergeFixtureChanges,
  sortObjectKeysDeep,
} from '../../framework/fixtures/fixture-validation';

/**
 * Normalizes the exported app state (from captureAppState) into the same
 * shape as fixture JSON's `state` subtree so they can be compared.
 *
 * Exported:  { redux: { alert, browser, ... }, engine: { AccountTrackerController, ... } }
 * Fixture:   { state: { alert, browser, ..., engine: { backgroundState: { AccountTrackerController, ... } } } }
 */
function normalizeExportedState(
  exported: Record<string, unknown>,
): Record<string, unknown> {
  const redux = exported.redux as Record<string, unknown>;
  const engine = exported.engine as Record<string, unknown>;
  return {
    ...redux,
    engine: {
      backgroundState: engine,
    },
  };
}

describe(
  RegressionWalletPlatform('Fixture Validation — Post-Onboarding'),
  () => {
    beforeAll(async () => {
      jest.setTimeout(150000);
    });

    it('compares live post-onboarding state against the default fixture', async () => {
      await withFixtures(
        {
          fixture: new FixtureBuilder().withOnboardingFixture().build(),
          restartDevice: true,
          useCommandQueueServer: true,
        },
        async ({ commandQueueServer }: TestSuiteParams) => {
          if (!commandQueueServer) {
            throw new Error('Command queue server not available');
          }

          // Complete onboarding flow
          await CreateNewWallet();

          // Capture live app state
          commandQueueServer.requestStateExport();
          const exported = await commandQueueServer.getExportedState();

          // Read the committed default fixture (post-onboarding baseline)
          const fixture = readFixtureFile('default-fixture.json');
          const fixtureState = fixture.state as Record<string, unknown>;

          // Normalize exported state to match fixture shape
          const liveState = normalizeExportedState(exported);

          // Compare
          const diff = computeSchemaDiff(fixtureState, liveState);

          // Write full diff report to a file for easy inspection
          const outputDir = path.resolve(
            __dirname,
            '..',
            '..',
            '..',
            'artifacts',
          );
          if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
          }
          const outputPath = path.join(
            outputDir,
            'fixture-validation-diff.txt',
          );

          if (hasSchemaDifferences(diff)) {
            const report = formatSchemaDiff(diff);
            const summary = [
              '--- Fixture Schema Diff ---',
              '',
              report,
              '',
              `New keys: ${diff.newKeys.length}`,
              `Missing keys: ${diff.missingKeys.length}`,
              `Type mismatches: ${diff.typeMismatches.length}`,
              `Value mismatches: ${diff.valueMismatches.length}`,
            ].join('\n');

            fs.writeFileSync(outputPath, summary, 'utf-8');
            console.log(`\nFull diff written to: ${outputPath}`);
            console.log(`\nNew keys: ${diff.newKeys.length}`);
            console.log(`Missing keys: ${diff.missingKeys.length}`);
            console.log(`Type mismatches: ${diff.typeMismatches.length}`);
            console.log(`Value mismatches: ${diff.valueMismatches.length}`);

            // Merge changes into the fixture and write updated version
            const mergedState = mergeFixtureChanges(
              fixtureState,
              liveState,
              diff,
            );
            const updatedFixture = sortObjectKeysDeep({
              ...fixture,
              state: mergedState,
            }) as Record<string, unknown>;

            const updatedFixturePath = path.join(
              outputDir,
              'updated-default-fixture.json',
            );
            fs.writeFileSync(
              updatedFixturePath,
              JSON.stringify(updatedFixture, null, 2) + '\n',
              'utf-8',
            );
            console.log(`\nUpdated fixture written to: ${updatedFixturePath}`);
          } else {
            const msg = 'No schema differences found — fixture is up to date.';
            fs.writeFileSync(outputPath, msg, 'utf-8');
            console.log(msg);
          }

          // For now, log the diff but don't fail.
          // Once the ignored-keys list is tuned, flip this to:
          //   expect(hasSchemaDifferences(diff)).toBe(false);
        },
      );
    });
  },
);
