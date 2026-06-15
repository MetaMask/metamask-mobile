import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeAccounts } from '../../tags.js';
import { loginToAppPlaywright } from '../../flows/wallet.flow.js';
import {
  goToAccountActions,
  completeSrpQuiz,
} from '../../flows/accounts.flow.js';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';

const FIRST_DEFAULT_HD_KEYRING_ACCOUNT = 0;
const FIRST_IMPORTED_HD_KEYRING_ACCOUNT = 2;

const DEFAULT_SRP =
  'mercy future burger kiwi rather neglect upper income morning borrow soda section';
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
              .withTwoImportedHdKeyringsAndTwoDefaultAccounts()
              .build(),
            restartDevice: true,
            currentDeviceDetails,
          },
          async () => {
            await loginToAppPlaywright({ scenarioType: 'e2e' });
            await goToAccountActions(FIRST_DEFAULT_HD_KEYRING_ACCOUNT);
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
              .withTwoImportedHdKeyringsAndTwoDefaultAccounts()
              .build(),
            restartDevice: true,
            currentDeviceDetails,
          },
          async () => {
            await loginToAppPlaywright({ scenarioType: 'e2e' });
            await goToAccountActions(FIRST_IMPORTED_HD_KEYRING_ACCOUNT);
            await completeSrpQuiz(IMPORTED_SRP);
          },
        );
      },
    );
  },
);
