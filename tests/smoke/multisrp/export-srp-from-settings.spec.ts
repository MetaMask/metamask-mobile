import { SmokeWalletPlatform } from '../../../e2e/tags';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.ts';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.ts';
import { loginToApp } from '../../../e2e/viewHelper.ts';
import {
  startExportForKeyring,
  completeSrpQuiz,
} from '../../flows/accounts.flow.ts';
import { defaultOptions } from '../../seeder/anvil-manager.ts';

const SRP_1 = {
  index: 1,
  id: '01JX9NJ15HPNS6RRRYBCKDK33R',
};

const SRP_2 = {
  index: 2,
  id: '01JX9NZWRAVQKES02TWSN8GD91',
};

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
        },
        async () => {
          await loginToApp();
          await startExportForKeyring(SRP_1.id);
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
        },
        async () => {
          await loginToApp();
          await startExportForKeyring(SRP_2.id);
          await completeSrpQuiz(IMPORTED_SRP);
        },
      );
    });
  },
);
