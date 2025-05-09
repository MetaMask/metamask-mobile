'use strict';
import { SmokeAccounts } from '../../tags';
import FixtureBuilder from '../../fixtures/fixture-builder';
import {
  defaultGanacheOptions,
  loadFixture,
  startFixtureServer,
  stopFixtureServer,
} from '../../fixtures/fixture-helper';
import FixtureServer from '../../fixtures/fixture-server';
import { getFixturesServerPort } from '../../fixtures/utils';
import { loginToApp } from '../../viewHelper';
import TestHelpers from '../../helpers';
import { goToAccountActions, completeSrpQuiz } from './utils';
const fixtureServer = new FixtureServer();

const FIRST_DEFAULT_HD_KEYRING_ACCOUNT = 0;
const FIRST_IMPORTED_HD_KEYRING_ACCOUNT = 2;

const DEFAULT_SRP = defaultGanacheOptions.mnemonic;
const IMPORTED_SRP =
  'lazy youth dentist air relief leave neither liquid belt aspect bone frame';

describe(
  SmokeAccounts('Multi-SRP: Exports the correct srp in account actions'),
  () => {
    beforeAll(async () => {
      await TestHelpers.reverseServerPort();
      const fixture = new FixtureBuilder()
        .withImportedHdKeyringAndTwoDefaultAccountsOneImportedHdAccountKeyringController()
        .build();
      await startFixtureServer(fixtureServer);
      await loadFixture(fixtureServer, { fixture });
      await TestHelpers.launchApp({
        launchArgs: { fixtureServerPort: `${getFixturesServerPort()}` },
      });
      await loginToApp();
    });

    afterAll(async () => {
      await stopFixtureServer(fixtureServer);
    });

    it('exports the correct srp for the default hd keyring', async () => {
      await goToAccountActions(FIRST_DEFAULT_HD_KEYRING_ACCOUNT);
      await completeSrpQuiz(DEFAULT_SRP);
    });

    it('exports the correct srp for the imported hd keyring', async () => {
      await goToAccountActions(FIRST_IMPORTED_HD_KEYRING_ACCOUNT);
      await completeSrpQuiz(IMPORTED_SRP);
    });
  },
);
