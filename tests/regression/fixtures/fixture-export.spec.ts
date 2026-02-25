// eslint-disable-next-line import/no-nodejs-modules, import/no-namespace
import * as fs from 'fs';
// eslint-disable-next-line import/no-namespace, import/no-nodejs-modules
import * as path from 'path';
import { FixtureValidation } from '../../tags';
import { CreateNewWallet } from '../../flows/wallet.flow';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { TestSuiteParams } from '../../framework/types';
import {
  readFixtureFile,
  computeSchemaDiff,
  formatSchemaDiff,
  mergeFixtureChanges,
  sortObjectKeysDeep,
  normalizeExportedState,
  FixtureSchemaDiff,
} from '../../framework/fixtures/fixture-validation';

describe(FixtureValidation('Fixture Export — Update Default Fixture'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
  });

  it('exports updated default fixture to disk', async () => {
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

        // Read the committed default fixture (existing-user baseline)
        const fixture = readFixtureFile('default-fixture.json');
        const fixtureState = fixture.state as Record<string, unknown>;

        // Normalize exported state to match fixture shape
        const liveState = normalizeExportedState(exported);

        // Compare
        const diff = computeSchemaDiff(fixtureState, liveState);

        // Target path: the actual committed fixture file
        const fixturePath = path.resolve(
          __dirname,
          '..',
          '..',
          'framework',
          'fixtures',
          'json',
          'default-fixture.json',
        );

        // Only merge structural changes (new keys, missing keys, type mismatches).
        // Value mismatches are NOT auto-merged because the default fixture
        // represents an existing user, not a fresh post-onboarding state.
        // Value differences are expected and intentional.
        const structuralDiff: FixtureSchemaDiff = {
          newKeys: diff.newKeys,
          missingKeys: diff.missingKeys,
          typeMismatches: diff.typeMismatches,
          valueMismatches: [],
        };

        const hasStructuralChanges =
          structuralDiff.newKeys.length > 0 ||
          structuralDiff.missingKeys.length > 0 ||
          structuralDiff.typeMismatches.length > 0;

        // Always log the full diff for visibility
        const report = formatSchemaDiff(diff);
        if (report) {
          console.log('\n--- Fixture diff report ---');
          console.log(report);
        }
        console.log(`New keys: ${diff.newKeys.length}`);
        console.log(`Missing keys: ${diff.missingKeys.length}`);
        console.log(`Type mismatches: ${diff.typeMismatches.length}`);
        console.log(
          `Value mismatches: ${diff.valueMismatches.length} (not auto-merged)`,
        );

        if (hasStructuralChanges) {
          // Merge only structural changes, preserving existing fixture values
          const mergedState = mergeFixtureChanges(
            fixtureState,
            liveState,
            structuralDiff,
          );
          const updatedFixture = sortObjectKeysDeep({
            ...fixture,
            state: mergedState,
          }) as Record<string, unknown>;

          fs.writeFileSync(
            fixturePath,
            JSON.stringify(updatedFixture, null, 2) + '\n',
            'utf-8',
          );
          console.log(`\nUpdated fixture written to: ${fixturePath}`);
          console.log(
            'Note: Only structural changes were applied. Value mismatches',
          );
          console.log(
            'require manual review — the fixture represents an existing user.',
          );
        } else {
          console.log(
            '\nNo structural changes — fixture schema is up to date.',
          );
        }
      },
    );
  });
});
