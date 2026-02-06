import { SmokeWalletPlatform } from '../../../e2e/tags';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.ts';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.ts';
import { loginToApp } from '../../../e2e/viewHelper.ts';
import {
  goToAccountActions,
  completeSrpQuiz,
} from '../../flows/accounts.flow.ts';
import { defaultOptions } from '../../seeder/anvil-manager.ts';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper.ts';
import { remoteFeatureMultichainAccountsAccountDetailsV2 } from '../../api-mocking/mock-responses/feature-flags-mocks.ts';

const FIRST_DEFAULT_HD_KEYRING_ACCOUNT = 0;
const FIRST_IMPORTED_HD_KEYRING_ACCOUNT = 2;

const DEFAULT_SRP = defaultOptions.mnemonic;
const IMPORTED_SRP =
  'lazy youth dentist air relief leave neither liquid belt aspect bone frame';

describe(
  SmokeWalletPlatform('Multi-SRP: Exports the correct srp in account actions'),
  () => {
    it('exports the correct srp for the default hd keyring', async () => {
      await withFixtures(
        {
          fixture: new FixtureBuilder()
            .withImportedHdKeyringAndTwoDefaultAccountsOneImportedHdAccountKeyringController()
            .build(),
          restartDevice: true,
          testSpecificMock: async (mockServer) => {
            await setupRemoteFeatureFlagsMock(
              mockServer,
              remoteFeatureMultichainAccountsAccountDetailsV2(false),
            );
          },
        },
        async () => {
          await loginToApp();
          await goToAccountActions(FIRST_DEFAULT_HD_KEYRING_ACCOUNT);
          await completeSrpQuiz(DEFAULT_SRP);
        },
      );
    });

    it('exports the correct srp for the imported hd keyring', async () => {
      await withFixtures(
        {
          fixture: new FixtureBuilder()
            .withImportedHdKeyringAndTwoDefaultAccountsOneImportedHdAccountKeyringController()
            .build(),
          restartDevice: true,
          testSpecificMock: async (mockServer) => {
            await setupRemoteFeatureFlagsMock(
              mockServer,
              remoteFeatureMultichainAccountsAccountDetailsV2(false),
            );
          },
        },
        async () => {
          await loginToApp();
          await goToAccountActions(FIRST_IMPORTED_HD_KEYRING_ACCOUNT);
          await completeSrpQuiz(IMPORTED_SRP);
        },
      );
    });
  },
);
