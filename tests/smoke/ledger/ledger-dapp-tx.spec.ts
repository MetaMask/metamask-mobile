import { SmokeLedger } from '../../tags';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import {
  withSpeculosFixtures,
  importLedgerAccount,
  type SpeculosTestSuiteParams,
} from '../../framework/fixtures/SpeculosFixtureHelper';
import Browser from '../../page-objects/Browser/BrowserView';
import TestDApp from '../../page-objects/Browser/TestDApp';
import ConnectBottomSheet from '../../page-objects/Browser/ConnectBottomSheet';
import FooterActions from '../../page-objects/Browser/Confirmations/FooterActions';
import HardwareWalletBottomSheet from '../../page-objects/Ledger/HardwareWalletBottomSheet';
import Assertions from '../../framework/Assertions';
import TestHelpers from '../../helpers';
import {
  navigateToBrowserViewSyncDisabled,
  waitForTestDappToLoad,
} from '../../flows/browser.flow';
import { DappVariants } from '../../framework/Constants';

const describeIf = process.env.LEDGER_E2E === '1' ? describe : describe.skip;

jest.setTimeout(600000);

describeIf(SmokeLedger('Sign dApp transaction via Ledger'), () => {
  it('should sign a dApp-initiated EIP-1559 transaction via Ledger', async () => {
    await withSpeculosFixtures(
      {
        fixture: new FixtureBuilder().withDefaultFixture().build(),
        startSpeculos: true,
        dapps: [{ dappVariant: DappVariants.TEST_DAPP }],
      },
      async ({ speculos }: SpeculosTestSuiteParams) => {
        await importLedgerAccount();

        await TestHelpers.delay(5000);

        await Assertions.expectElementToNotBeVisible(
          HardwareWalletBottomSheet.container,
          {
            timeout: 30000,
            description:
              'Hardware wallet bottom sheet should dismiss after import',
          },
        );

        // Enable blind signing on the virtual Ledger device.
        // EIP-1559 transactions require blind signing on the Ethereum app.
        await speculos.enableBlindSigning();

        await navigateToBrowserViewSyncDisabled();
        await Browser.navigateToTestDApp();
        await waitForTestDappToLoad();

        // Connect the dapp. The standard dapp-tx test pre-connects via the
        // fixture (withPermissionControllerConnectedToTestDapp); that fixture
        // option crashes the Ledger setup, so connect via the UI here. The Send
        // EIP1559 button is not tappable until the dapp is connected.
        await TestDApp.connect();
        await ConnectBottomSheet.tapConnectButton();
        await TestHelpers.delay(3000);

        await TestDApp.tapSendEIP1559Button();
        await TestHelpers.delay(3000);

        await FooterActions.tapConfirmButton(30000);

        // Wait for the HW bottom sheet to appear in any state
        // (scanning, connecting, awaiting-confirmation, etc.).
        await HardwareWalletBottomSheet.waitForVisible(90000);
        await TestHelpers.delay(2000);

        // If in device-selection state, reconnect the virtual device.
        try {
          await HardwareWalletBottomSheet.waitForDeviceSelection(10000);
          await HardwareWalletBottomSheet.selectVirtualDevice();
          await TestHelpers.delay(2000);
          await HardwareWalletBottomSheet.tapConnect();
        } catch {
          // Device already connected; bottom sheet is in connecting/awaiting state.
        }

        await Assertions.expectElementToBeVisible(
          HardwareWalletBottomSheet.awaitingConfirmationContent,
          { timeout: 120000 },
        );

        // Press buttons on the virtual Ledger device to approve the transaction.
        await speculos.approveTransaction();

        await Assertions.expectElementToBeVisible(
          HardwareWalletBottomSheet.successContent,
          { timeout: 60000 },
        );
      },
    );
  });
});
