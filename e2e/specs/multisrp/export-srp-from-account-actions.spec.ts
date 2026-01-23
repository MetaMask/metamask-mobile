import { SmokeWalletPlatform } from '../../tags';
import FixtureBuilder from '../../../tests/framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../../tests/framework/fixtures/FixtureHelper';
import { loginToApp } from '../../viewHelper';
import { goToWalletDetailsAndTapSRP, completeSrpQuiz } from './utils';
import { defaultOptions } from '../../seeder/anvil-manager';
import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper';
import { remoteFeatureMultichainAccountsAccountDetailsV2 } from '../../api-mocking/mock-responses/feature-flags-mocks';

const FIRST_DEFAULT_HD_KEYRING_ACCOUNT = 0;
const FIRST_IMPORTED_HD_KEYRING_ACCOUNT = 2;

const DEFAULT_SRP = defaultOptions.mnemonic;
const IMPORTED_SRP =
  'lazy youth dentist air relief leave neither liquid belt aspect bone frame';

describe(
  SmokeWalletPlatform('Multi-SRP: Exports the correct srp in account actions'),
  () => {
    const testSpecificMock = async (mockServer: Mockttp) => {
      await setupRemoteFeatureFlagsMock(
        mockServer,
        remoteFeatureMultichainAccountsAccountDetailsV2(),
      );
    };

    it('exports the correct srp for the default hd keyring', async () => {
      await withFixtures(
        {
          fixture: new FixtureBuilder()
            .withImportedHdKeyringAndTwoDefaultAccountsOneImportedHdAccountKeyringController()
            .build(),
          restartDevice: true,
          testSpecificMock,
        },
        async () => {
          await loginToApp();
          await goToWalletDetailsAndTapSRP(FIRST_DEFAULT_HD_KEYRING_ACCOUNT);
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
          testSpecificMock,
        },
        async () => {
          await loginToApp();
          await goToWalletDetailsAndTapSRP(FIRST_IMPORTED_HD_KEYRING_ACCOUNT);
          await completeSrpQuiz(IMPORTED_SRP);
        },
      );
    });
  },
);
