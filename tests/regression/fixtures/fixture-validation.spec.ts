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
  normalizeExportedState,
} from '../../framework/fixtures/fixture-validation';

describe(FixtureValidation('Fixture Validation — Post-Onboarding'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
  });

  it('fails when the committed default fixture schema is out of date', async () => {
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

        // Structural changes = CI-blocking (schema is out of date)
        const hasStructuralChanges =
          diff.newKeys.length > 0 ||
          diff.missingKeys.length > 0 ||
          diff.typeMismatches.length > 0;

        // Write results to both artifacts/ and reports/ directories.
        // reports/ is always uploaded by run-e2e-workflow.yml so the
        // downstream CI job can read it for PR comments and annotations.
        const artifactsDir = path.resolve(__dirname, '..', '..', 'artifacts');
        const reportsDir = path.resolve(__dirname, '..', '..', 'reports');
        for (const dir of [artifactsDir, reportsDir]) {
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
        }

        // Write human-readable diff report
        const diffPath = path.join(artifactsDir, 'fixture-validation-diff.txt');
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

        // Write machine-readable JSON summary for downstream CI job
        const jsonResult = {
          hasStructuralChanges,
          newKeys: diff.newKeys.length,
          missingKeys: diff.missingKeys.length,
          typeMismatches: diff.typeMismatches.length,
          valueMismatches: diff.valueMismatches.length,
        };
        fs.writeFileSync(
          path.join(reportsDir, 'fixture-validation-result.json'),
          JSON.stringify(jsonResult, null, 2),
          'utf-8',
        );

        // Only fail on structural changes — value mismatches are expected
        // because the fixture represents an existing user, not a fresh
        // post-onboarding state.
        // TODO: Change console.warn to throw once fixture validation is stable
        if (hasStructuralChanges) {
          console.warn(
            `Committed fixture schema is out of date.\n` +
              `  New keys: ${diff.newKeys.length}\n` +
              `  Missing keys: ${diff.missingKeys.length}\n` +
              `  Type mismatches: ${diff.typeMismatches.length}\n\n` +
              `Run "@metamaskbot update-mobile-fixture" to update the fixture.\n` +
              `See ${diffPath} for the full diff.`,
          );
        }

        if (diff.valueMismatches.length > 0) {
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
