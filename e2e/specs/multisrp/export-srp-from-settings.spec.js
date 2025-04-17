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
import { startExportForKeyring, completeSrpQuiz } from './utils';

const fixtureServer = new FixtureServer();

const SRP_1 = {
  index: 1,
  id: '01JN61V4CZ5WSJXSS7END4FJQ9',
};

const SRP_2 = {
  index: 2,
  id: '01JN61V9ACE7ZA3ZRZFPYFYCJ1',
};

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
      await startExportForKeyring(SRP_1.id);
      await completeSrpQuiz(DEFAULT_SRP);
    });

    it('exports the correct srp for the imported hd keyring', async () => {
      await startExportForKeyring(SRP_2.id);
      await completeSrpQuiz(IMPORTED_SRP);
    });
  },
);
