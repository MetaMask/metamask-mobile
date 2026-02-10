import { SmokeWalletPlatform } from '../../../e2e/tags';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.ts';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.ts';
import { loginToApp } from '../../../e2e/viewHelper.ts';
import {
  goToAccountActions,
  completeSrpQuiz,
} from '../../flows/accounts.flow.ts';

const FIRST_DEFAULT_HD_KEYRING_ACCOUNT = 0;
const FIRST_IMPORTED_HD_KEYRING_ACCOUNT = 2;

const DEFAULT_SRP =
  'mercy future burger kiwi rather neglect upper income morning borrow soda section';
const IMPORTED_SRP =
  'lazy youth dentist air relief leave neither liquid belt aspect bone frame';

describe(
  SmokeWalletPlatform('Multi-SRP: Exports the correct srp in account actions'),
  () => {
    it('exports the correct srp for the default hd keyring', async () => {
      await withFixtures(
        {
          fixture: new FixtureBuilder()
            .withTwoImportedHdKeyringsAndTwoDefaultAccounts()
            .build(),
          restartDevice: true,
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
            .withTwoImportedHdKeyringsAndTwoDefaultAccounts()
            .build(),
          restartDevice: true,
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
