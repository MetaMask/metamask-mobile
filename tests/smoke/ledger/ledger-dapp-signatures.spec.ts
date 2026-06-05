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

describeIf(SmokeLedger, () => {
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

        // DEBUG: Inspect the WebView hierarchy to understand why Detox can't find it
        await TestHelpers.delay(5000);
        try {
          const attrs = await element(by.id('browser-webview')).getAttributes();
          // eslint-disable-next-line no-console
          console.log(
            '[DEBUG] browser-webview attributes:',
            JSON.stringify(attrs),
          );
        } catch (e) {
          // eslint-disable-next-line no-console
          console.log('[DEBUG] Failed to get attributes:', e);
        }

        await waitForTestDappToLoad();

        await speculos.enableBlindSigning();
        await TestHelpers.delay(3000);

        await TestDApp.tapPersonalSignButton();
        await TestHelpers.delay(3000);

        await Assertions.expectElementToBeVisible(
          RequestTypes.PersonalSignRequest,
        );

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

        await speculos.enableBlindSigning();
        await TestHelpers.delay(3000);

        await TestDApp.tapTypedV4SignButton();
        await TestHelpers.delay(3000);

        await Assertions.expectElementToBeVisible(
          RequestTypes.TypedSignRequest,
        );

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
