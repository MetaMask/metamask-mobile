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
import AccountListBottomSheet from '../../pages/wallet/AccountListBottomSheet';
import AddAccountBottomSheet from '../../pages/wallet/AddAccountBottomSheet';
import SRPListItemComponent from '../../pages/wallet/MultiSrp/Common/SRPListItemComponent';
import AddNewHdAccountComponent from '../../pages/wallet/MultiSrp/AddAccountToSrp/AddNewHdAccountComponent';

const fixtureServer = new FixtureServer();

const SRP_1 = {
  index: 1,
  id: '01JN61V4CZ5WSJXSS7END4FJQ9',
};

const SRP_2 = {
  index: 2,
  id: '01JN61V9ACE7ZA3ZRZFPYFYCJ1',
};

const addAccountToSrp = async (srp, accountName) => {
  await AccountListBottomSheet.tapAddAccountButton();
  await AddAccountBottomSheet.tapCreateAccount();
  await Assertions.checkIfVisible(AddNewHdAccountComponent.container);

  // convert srpNumber to index
  const srpIndex = srp.index - 1;

  if (srpIndex < 0) {
    throw new Error('Invalid SRP number');
  }

  // Need to select the srp if its not the default srp
  if (srpIndex > 0) {
    // Need to tap the first srp to open the list
    await AddNewHdAccountComponent.tapSrpSelector();
    await SRPListItemComponent.tapListItem(srp.id);
  }

  // After entering the name the return key is
  // entered to submit the name and account creation
  if (accountName) {
    await AddNewHdAccountComponent.enterName(accountName);
  } else {
    await AddNewHdAccountComponent.tapConfirm();
  }

  await Assertions.checkIfVisible(AccountListBottomSheet.accountList);
};

describe(SmokeAccounts('Multi-SRP: Add new account to a specific SRP'), () => {
  beforeAll(async () => {
    await TestHelpers.reverseServerPort();
    const fixture = new FixtureBuilder()
      .withImportedHdKeyringController()
      .build();
    await startFixtureServer(fixtureServer);
    await loadFixture(fixtureServer, { fixture });
    await TestHelpers.launchApp({
      launchArgs: { fixtureServerPort: `${getFixturesServerPort()}` },
    });
    await loginToApp();
    await WalletView.tapIdenticon();
    await Assertions.checkIfVisible(AccountListBottomSheet.accountList);
  });

  afterAll(async () => {
    await stopFixtureServer(fixtureServer);
  });

  it('adds an account to default SRP', async () => {
    await addAccountToSrp(SRP_1, 'Account 3');
  });

  it('adds an account to the imported SRP', async () => {
    await addAccountToSrp(SRP_2, 'Account 4');
  });
});
