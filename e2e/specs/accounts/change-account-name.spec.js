'use strict';
import { loginToApp } from '../../viewHelper';
import FixtureBuilder from '../../fixtures/fixture-builder';
import {
  loadFixture,
  startFixtureServer,
  stopFixtureServer,
  defaultGanacheOptions,
} from '../../fixtures/fixture-helper';
import TestHelpers from '../../helpers';
import FixtureServer from '../../fixtures/fixture-server';
import { getFixturesServerPort } from '../../fixtures/utils';
import { SmokeAccounts } from '../../tags';
import WalletView from '../../pages/wallet/WalletView';
import AccountActionsModal from '../../pages/modals/AccountActionsModal';
import EditAccountNameView from '../../pages/EditAccountNameView';
import EditAccountNameSelectorIDs from '../../selectors/EditAccountName.selectors';
import Gestures from '../../utils/Gestures';

// import Assertions from '../../utils/Assertions';

const fixtureServer = new FixtureServer();
const NEW_ACCOUNT_NAME = 'Edited Name';

describe(SmokeAccounts('Change Account Name'), () => {
  beforeAll(async () => {
    await TestHelpers.reverseServerPort();
    const fixture = new FixtureBuilder().withGanacheNetwork().build();
    await startFixtureServer(fixtureServer);
    await loadFixture(fixtureServer, { fixture });
    await device.launchApp({
      permissions: { notifications: 'YES' },
      ganacheOptions: defaultGanacheOptions,
      launchArgs: { fixtureServerPort: `${getFixturesServerPort()}` },
    });
    await loginToApp();
  });

  afterAll(async () => {
    await stopFixtureServer(fixtureServer);
  });
  it('renames an account', async () => {
    await WalletView.tapMainWalletAccountActions();
    await AccountActionsModal.tapEditAccount();
    await Gestures.clearField(EditAccountNameView.accountNameInput());
    await TestHelpers.typeText(
      EditAccountNameSelectorIDs.ACCOUNT_NAME_INPUT,
      NEW_ACCOUNT_NAME,
    );
    await EditAccountNameView.tapSave();
  });
});
