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
  hasStructuralChanges as hasStructuralChangesCheck,
  getAutoUpdatableKeys,
  FixtureSchemaDiff,
} from '../../framework/fixtures/fixture-validation';

describe(FixtureValidation('Fixture Validation — Post-Onboarding'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
  });

  it('validates the committed fixture and exports updates when structural changes exist', async () => {
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
        const report = formatSchemaDiff(diff);

        const hasStructuralChanges = hasStructuralChangesCheck(diff);

        // --- Validation: write reports for CI ---

        const reportsDir = path.resolve(__dirname, '..', '..', 'reports');
        if (!fs.existsSync(reportsDir)) {
          fs.mkdirSync(reportsDir, { recursive: true });
        }

        // Human-readable diff report (written to reportsDir so it's always uploaded)
        const diffPath = path.join(reportsDir, 'fixture-validation-diff.txt');
        if (hasStructuralChanges || diff.valueMismatches.length > 0) {
          const summary = [
            '--- Fixture Diff Report ---',
            '',
            report,
            '',
            `New keys: ${diff.newKeys.length}`,
            `Missing keys: ${diff.missingKeys.length}`,
            `Type mismatches: ${diff.typeMismatches.length}`,
            `Value mismatches: ${diff.valueMismatches.length} (informational)`,
            '',
            'To update the committed fixture, comment on the PR:',
            '  @metamaskbot update-mobile-fixture',
          ].join('\n');

          fs.writeFileSync(diffPath, summary, 'utf-8');
          console.log(`\nFull diff written to: ${diffPath}`);
        } else {
          fs.writeFileSync(
            diffPath,
            'No differences found — fixture is up to date.',
            'utf-8',
          );
        }

        // Machine-readable JSON summary for downstream CI job
        fs.writeFileSync(
          path.join(reportsDir, 'fixture-validation-result.json'),
          JSON.stringify(
            {
              hasStructuralChanges,
              newKeys: diff.newKeys.length,
              missingKeys: diff.missingKeys.length,
              typeMismatches: diff.typeMismatches.length,
              valueMismatches: diff.valueMismatches.length,
            },
            null,
            2,
          ),
          'utf-8',
        );

        // --- Export: update fixture file when changes exist ---

        // Promote auto-updatable value mismatches (e.g. fiatOrders.networks)
        // so they get merged alongside structural changes.
        const autoUpdatableKeys = getAutoUpdatableKeys();
        const autoUpdateMismatches = diff.valueMismatches.filter((m) =>
          autoUpdatableKeys.includes(m.key),
        );

        const shouldUpdate =
          hasStructuralChanges || autoUpdateMismatches.length > 0;

        if (shouldUpdate) {
          // Merge structural changes + auto-updatable value mismatches.
          // Other value mismatches are NOT auto-merged because the default
          // fixture represents an existing user, not a fresh post-onboarding state.
          const structuralDiff: FixtureSchemaDiff = {
            newKeys: diff.newKeys,
            missingKeys: diff.missingKeys,
            typeMismatches: diff.typeMismatches,
            valueMismatches: autoUpdateMismatches,
          };

          const mergedState = mergeFixtureChanges(
            fixtureState,
            liveState,
            structuralDiff,
          );
          const updatedFixture = sortObjectKeysDeep({
            ...fixture,
            state: mergedState,
          }) as Record<string, unknown>;

          // Only write to the source fixture file in CI to avoid accidental
          // local modifications. Locally the diff report is still written to
          // the reports directory for inspection.
          const isCI =
            process.env.CI === 'true' || process.env.GITHUB_CI === 'true';
          const fixturePath = isCI
            ? path.resolve(
                __dirname,
                '..',
                '..',
                'framework',
                'fixtures',
                'json',
                'default-fixture.json',
              )
            : path.join(reportsDir, 'updated-default-fixture.json');

          fs.writeFileSync(
            fixturePath,
            JSON.stringify(updatedFixture, null, 2) + '\n',
            'utf-8',
          );

          // TODO: Change console.warn to throw once fixture validation is stable
          console.warn(
            `Committed fixture is out of date.\n` +
              `  New keys: ${diff.newKeys.length}\n` +
              `  Missing keys: ${diff.missingKeys.length}\n` +
              `  Type mismatches: ${diff.typeMismatches.length}\n` +
              `  Auto-updated values: ${autoUpdateMismatches.length}\n\n` +
              `Updated fixture written to: ${fixturePath}\n` +
              `Structural changes and auto-updatable keys were applied.\n` +
              `Other value mismatches require manual review.`,
          );
        } else if (diff.valueMismatches.length > 0) {
          console.log(
            `\nFixture schema is up to date. ${diff.valueMismatches.length} value mismatches detected (expected — fixture represents an existing user).`,
          );
        } else {
          console.log('No differences found — fixture is up to date.');
        }
      },
    );
  });
});
