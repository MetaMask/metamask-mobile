import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeAccounts } from '../../tags.js';
import { loginToAppPlaywright } from '../../flows/wallet.flow.js';
import {
  startExportForKeyring,
  completeSrpQuiz,
} from '../../flows/accounts.flow.js';
import { defaultGanacheOptions } from '../../framework/Constants.js';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';

const SRP_1 = {
  index: 1,
  id: '01JX9NJ15HPNS6RRRYBCKDK33R',
};

const SRP_2 = {
  index: 2,
  id: '01JX9NZWRAVQKES02TWSN8GD91',
};

const DEFAULT_SRP = defaultGanacheOptions.mnemonic;
const IMPORTED_SRP =
  'lazy youth dentist air relief leave neither liquid belt aspect bone frame';

appiumTest.describe(
  SmokeAccounts('Multi-SRP: Exports the correct srp in account actions'),
  () => {
    appiumTest(
      'exports the correct srp for the default hd keyring',
      async ({ driver: _driver, currentDeviceDetails }) => {
        await withFixtures(
          {
            fixture: new FixtureBuilder()
              .withImportedHdKeyringAndTwoDefaultAccountsOneImportedHdAccountKeyringController()
              .build(),
            restartDevice: true,
            currentDeviceDetails,
          },
          async () => {
            await loginToAppPlaywright({ scenarioType: 'e2e' });
            await startExportForKeyring(SRP_1.id);
            await completeSrpQuiz(DEFAULT_SRP);
          },
        );
      },
    );

    appiumTest(
      'exports the correct srp for the imported hd keyring',
      async ({ driver: _driver, currentDeviceDetails }) => {
        await withFixtures(
          {
            fixture: new FixtureBuilder()
              .withImportedHdKeyringAndTwoDefaultAccountsOneImportedHdAccountKeyringController()
              .build(),
            restartDevice: true,
            currentDeviceDetails,
          },
          async () => {
            await loginToAppPlaywright({ scenarioType: 'e2e' });
            await startExportForKeyring(SRP_2.id);
            await completeSrpQuiz(IMPORTED_SRP);
          },
        );
      },
    );
  },
);
