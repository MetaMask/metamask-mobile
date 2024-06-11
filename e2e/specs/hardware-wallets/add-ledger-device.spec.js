'use strict';
import { loginToApp } from '../../viewHelper';
import AccountListView from '../../pages/AccountListView';
import FixtureBuilder from '../../fixtures/fixture-builder';
import {
  loadFixture,
  startFixtureServer,
  stopFixtureServer,
} from '../../fixtures/fixture-helper';
import { CustomNetworks } from '../../resources/networks.e2e';
import TestHelpers from '../../helpers';
import FixtureServer from '../../fixtures/fixture-server';
import { getFixturesServerPort } from '../../fixtures/utils';
import { Regression } from '../../tags';
import WalletView from '../../pages/WalletView';
import SelectHardwareWalletView from '../../pages/SelectHardwareWalletView';
import { log } from 'detox';

// jest.mock('../../../app/components/hooks/Ledger/useLedgerBluetooth', () => ({
//   ...jest.requireActual(
//     '../../../app/components/hooks/Ledger/useLedgerBluetooth',
//   ),
//   isSendingLedgerCommands: true,
// }));
// jest.mock('../../../app/components/hooks/useBluetoothPermissions', () => ({
//   ...jest.requireActual(
//     '../../../app/components/hooks/useBluetoothPermissions',
//   ),
//   hasBluetoothPermissions: true,
// }));

const fixtureServer = new FixtureServer();

describe(Regression('Add ledger device'), () => {
  // let swapOnboarded = true; // TODO: Set it to false once we show the onboarding page again.
  beforeAll(async () => {
    await TestHelpers.reverseServerPort();
    const fixture = new FixtureBuilder()
      .withNetworkController(CustomNetworks.Tenderly)
      .build();
    await startFixtureServer(fixtureServer);
    await loadFixture(fixtureServer, { fixture });
    await device.launchApp({
      permissions: { notifications: 'YES' },
      launchArgs: { fixtureServerPort: `${getFixturesServerPort()}` },
    });
    await loginToApp();
  });

  afterAll(async () => {
    await stopFixtureServer(fixtureServer);
  });

  beforeEach(async () => {
    jest.setTimeout(150000);
  });

  it('plop', async () => {
    log.info('process.env.IS_TEST', process.env.IS_TEST);
    await WalletView.tapIdenticon();
    await AccountListView.isVisible();
    await AccountListView.tapAddAccountButton();
    await AccountListView.tapAddHardwareWalletButton();
    await SelectHardwareWalletView.tapLedgerButton();
  });
});
