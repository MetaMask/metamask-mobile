'use strict';
import { SmokeAccounts } from '../../tags';
import FixtureBuilder from '../../fixtures/fixture-builder';
import {
  loadFixture,
  startFixtureServer,
  stopFixtureServer,
} from '../../fixtures/fixture-helper';
import FixtureServer from '../../fixtures/fixture-server';
import { getFixturesServerPort } from '../../fixtures/utils';
import WalletView from '../../pages/wallet/WalletView';
import { loginToApp } from '../../viewHelper';
import Assertions from '../../utils/Assertions';
import TestHelpers from '../../helpers';
import ImportSrpView from '../../pages/importSrp/ImportSrpView';
import { goToImportSrp, inputSrp } from './utils';

const fixtureServer = new FixtureServer();

const valid12WordMnemonic =
  'lazy youth dentist air relief leave neither liquid belt aspect bone frame';

const valid24WordMnemonic =
  'verb middle giant soon wage common wide tool gentle garlic issue nut retreat until album recall expire bronze bundle live accident expect dry cook';

describe(SmokeAccounts('Import new srp to wallet'), () => {
  beforeAll(async () => {
    await TestHelpers.reverseServerPort();
    const fixture = new FixtureBuilder()
      .withImportedAccountKeyringController()
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

  it('imports a new 12 word srp', async () => {
    await goToImportSrp();
    await inputSrp(valid12WordMnemonic);
    await ImportSrpView.tapImportButton();

    await Assertions.checkIfVisible(WalletView.container);
    await Assertions.checkIfElementNotToHaveText(
      WalletView.accountName,
      'Account 1',
    );
  });

  it('imports a new 24 word srp', async () => {
    await goToImportSrp();
    await inputSrp(valid24WordMnemonic);
    await ImportSrpView.tapImportButton();

    await Assertions.checkIfVisible(WalletView.container);
    await Assertions.checkIfElementNotToHaveText(
      WalletView.accountName,
      'Account 1',
    );
  });
});
