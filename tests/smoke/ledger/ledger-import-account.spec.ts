import { SmokeLedger } from '../../tags';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import {
  withSpeculosFixtures,
  type SpeculosTestSuiteParams,
} from '../../framework/fixtures/SpeculosFixtureHelper';
import WalletView from '../../page-objects/wallet/WalletView';
import AccountListBottomSheet from '../../page-objects/wallet/AccountListBottomSheet';
import LedgerConnectView from '../../page-objects/Ledger/LedgerConnectView';
import Assertions from '../../framework/Assertions';
import { loginToApp } from '../../flows/wallet.flow';
import { waitForAppReady } from '../../flows/general.flow';
import TestHelpers from '../../helpers';

const describeIf = process.env.LEDGER_E2E === '1' ? describe : describe.skip;

jest.setTimeout(600000);

describeIf(SmokeLedger('Import Ledger account via Speculos'), () => {
  it('discovers and imports a Ledger account from virtual device', async () => {
    await withSpeculosFixtures(
      {
        fixture: new FixtureBuilder().withDefaultFixture().build(),
        startSpeculos: true,
      },
      async ({ speculos }: SpeculosTestSuiteParams) => {
        await TestHelpers.delay(5000);
        await waitForAppReady(300000);
        await loginToApp();

        await TestHelpers.delay(5000);
        await WalletView.tapIdenticon();
        await TestHelpers.delay(8000);
        await AccountListBottomSheet.tapAddAccountButton();
        await TestHelpers.delay(5000);

        await LedgerConnectView.tapAddHardwareWallet();
        await TestHelpers.delay(3000);

        await LedgerConnectView.tapLedgerButton();
        await TestHelpers.delay(5000);

        await LedgerConnectView.waitForDeviceToAppear(60000);

        await LedgerConnectView.assertVirtualDeviceVisible();

        await LedgerConnectView.selectVirtualDevice();
        await TestHelpers.delay(2000);
        await LedgerConnectView.tapConnect();

        await TestHelpers.delay(10000);

        await Assertions.expectElementToBeVisible(
          LedgerConnectView.nextAccountsButton,
          {
            description: 'Account list should be visible after discovery',
            timeout: 60000,
          },
        );

        await LedgerConnectView.tapNextAccountsButton();

        await TestHelpers.delay(5000);

        await Assertions.expectElementToBeVisible(WalletView.container, {
          description:
            'Wallet view should be visible after importing Ledger account',
        });
      },
    );
  });
});
