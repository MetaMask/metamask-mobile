import { SmokeLedger } from '../../tags';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import {
  withSpeculosFixtures,
  importLedgerAccount,
  type SpeculosTestSuiteParams,
} from '../../framework/fixtures/SpeculosFixtureHelper';
import Browser from '../../page-objects/Browser/BrowserView';
import TestDApp from '../../page-objects/Browser/TestDApp';
import FooterActions from '../../page-objects/Browser/Confirmations/FooterActions';
import HardwareWalletBottomSheet from '../../page-objects/Ledger/HardwareWalletBottomSheet';
import Assertions from '../../framework/Assertions';
import TestHelpers from '../../helpers';
import {
  navigateToBrowserView,
  waitForTestDappToLoad,
} from '../../flows/browser.flow';

jest.setTimeout(600000);

describe(SmokeLedger, () => {
  it('should sign a dApp-initiated EIP-1559 transaction via Ledger', async () => {
    await withSpeculosFixtures(
      {
        fixture: new FixtureBuilder().withDefaultFixture().build(),
        startSpeculos: true,
      },
      async ({ speculos }: SpeculosTestSuiteParams) => {
        await importLedgerAccount();

        await navigateToBrowserView();
        await Browser.navigateToTestDApp();
        await waitForTestDappToLoad();

        await TestDApp.tapSendEIP1559Button();
        await TestHelpers.delay(3000);

        speculos.autoApproveSigning();
        await FooterActions.tapConfirmButton(30000);

        await Assertions.expectElementToBeVisible(
          HardwareWalletBottomSheet.awaitingConfirmationContent,
          { timeout: 30000 },
        );

        await Assertions.expectElementToBeVisible(
          HardwareWalletBottomSheet.successContent,
          { timeout: 60000 },
        );
      },
    );
  });
});
