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
import RequestTypes from '../../page-objects/Browser/Confirmations/RequestTypes';
import HardwareWalletBottomSheet from '../../page-objects/Ledger/HardwareWalletBottomSheet';
import Assertions from '../../framework/Assertions';
import TestHelpers from '../../helpers';
import {
  navigateToBrowserView,
  waitForTestDappToLoad,
} from '../../flows/browser.flow';
import { DappVariants } from '../../framework/Constants';

const describeIf = process.env.LEDGER_E2E === '1' ? describe : describe.skip;
jest.setTimeout(600000);

describeIf(SmokeLedger('Sign dApp signatures via Ledger'), () => {
  it('should sign a personal_sign request via Ledger', async () => {
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

        await navigateToBrowserView();
        await Browser.navigateToTestDApp();
        await waitForTestDappToLoad();

        // Enable blind signing — required for personal_sign on the Ethereum app.
        await speculos.enableBlindSigning();
        await TestHelpers.delay(3000);

        await TestDApp.tapPersonalSignButton();
        await TestHelpers.delay(3000);

        await Assertions.expectElementToBeVisible(
          RequestTypes.PersonalSignRequest,
        );

        await FooterActions.tapConfirmButton(30000);

        // Wait for the HW bottom sheet to appear in any state.
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

        // Press buttons on the virtual Ledger device to approve the signature.
        await speculos.autoApproveSigning();

        await Assertions.expectElementToBeVisible(
          HardwareWalletBottomSheet.successContent,
          { timeout: 60000 },
        );
      },
    );
  });

  it('should sign a signTypedData_v4 request via Ledger', async () => {
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

        await navigateToBrowserView();
        await Browser.navigateToTestDApp();
        await waitForTestDappToLoad();

        // Enable blind signing — required for typed data signing on the Ethereum app.
        await speculos.enableBlindSigning();
        await TestHelpers.delay(3000);

        await TestDApp.tapTypedV4SignButton();
        await TestHelpers.delay(3000);

        await Assertions.expectElementToBeVisible(
          RequestTypes.TypedSignRequest,
        );

        await FooterActions.tapConfirmButton(30000);

        // Wait for the HW bottom sheet to appear in any state.
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

        // Press buttons on the virtual Ledger device to approve the signature.
        await speculos.autoApproveSigning();

        await Assertions.expectElementToBeVisible(
          HardwareWalletBottomSheet.successContent,
          { timeout: 60000 },
        );
      },
    );
  });
});
