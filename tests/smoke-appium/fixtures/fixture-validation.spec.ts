// eslint-disable-next-line import-x/no-nodejs-modules, import-x/no-namespace
import * as fs from 'fs';
// eslint-disable-next-line import-x/no-namespace, import-x/no-nodejs-modules
import * as path from 'path';
import { merge } from 'lodash';
import { WalletHomeOnboardingStepsSelectors } from '../../../app/components/UI/WalletHomeOnboardingSteps/WalletHomeOnboardingSteps.testIds';
import { WalletViewSelectorsIDs } from '../../../app/components/Views/Wallet/WalletView.testIds';
import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { FixtureValidation } from '../../tags.js';
import {
  CreateNewWallet,
  loginToAppPlaywright,
} from '../../flows/wallet.flow.js';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import { TestSuiteParams } from '../../framework/types.js';
import Assertions from '../../framework/Assertions.js';
import Matchers from '../../framework/Matchers.js';
import WalletView from '../../page-objects/wallet/WalletView.js';
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
} from '../../framework/fixtures/fixture-validation.js';

/**
 * AccountGroupBalance overrides WalletHomeOnboardingSteps' root testID with the
 * empty-state container id, so the primary CTA id is composed from both.
 */
const walletHomeOnboardingPrimaryButtonId = `${WalletViewSelectorsIDs.BALANCE_EMPTY_STATE_CONTAINER}-${WalletHomeOnboardingStepsSelectors.PRIMARY_BUTTON}`;

appiumTest.describe(
  FixtureValidation('Fixture Validation — Post-Onboarding'),
  () => {
    appiumTest.describe.configure({ timeout: 150000 });

    appiumTest(
      'validates the committed fixture and exports updates when structural changes exist',
      async ({ driver: _driver, currentDeviceDetails }) => {
        await withFixtures(
          {
            fixture: new FixtureBuilder().withOnboardingFixture().build(),
            restartDevice: true,
            currentDeviceDetails,
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
            const diffPath = path.join(
              reportsDir,
              'fixture-validation-diff.txt',
            );
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

              throw new Error(
                `Committed fixture is out of date.\n` +
                  `  New keys: ${diff.newKeys.length}\n` +
                  `  Missing keys: ${diff.missingKeys.length}\n` +
                  `  Type mismatches: ${diff.typeMismatches.length}\n` +
                  `  Auto-updated values: ${autoUpdateMismatches.length}\n\n` +
                  `Updated fixture written to: ${fixturePath}\n` +
                  `Structural changes and auto-updatable keys were applied.\n` +
                  `Other value mismatches require manual review.\n\n` +
                  `To fix: commit the updated fixture, or add new keys to getMobileFixtureIgnoredKeys() in fixture-validation.ts.`,
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
      },
    );

    // Default fixture keeps eligible=false (existing-user baseline). This case
    // forces eligible=true to cover the overlay that hides Buy/Send/Swap.
    appiumTest(
      'shows wallet home onboarding steps when eligibility is true and hides main actions',
      async ({ driver: _driver, currentDeviceDetails }) => {
        const fixture = new FixtureBuilder().build();
        merge(fixture.state, {
          onboarding: {
            walletHomeOnboardingStepsEligible: true,
            walletHomeOnboardingSkipInitialBalanceWait: true,
            walletHomeOnboardingSteps: {
              stepIndex: 0,
              suppressedReason: null,
            },
          },
        });

        await withFixtures(
          {
            fixture,
            restartDevice: true,
            currentDeviceDetails,
          },
          async () => {
            await loginToAppPlaywright({ scenarioType: 'e2e' });

            await Assertions.expectElementToBeVisible(
              Matchers.getElementByID(walletHomeOnboardingPrimaryButtonId),
              {
                description:
                  'Wallet home onboarding primary CTA should be visible when eligible',
              },
            );

            await Assertions.expectElementToNotBeVisible(
              WalletView.walletBuyButton,
              {
                description:
                  'Buy button should be hidden while wallet home onboarding steps are active',
              },
            );
          },
        );
      },
    );
  },
);
