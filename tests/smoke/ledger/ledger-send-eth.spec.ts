import { SmokeLedger } from '../../tags';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import {
  withSpeculosFixtures,
  importLedgerAccount,
  type SpeculosTestSuiteParams,
} from '../../framework/fixtures/SpeculosFixtureHelper';
import WalletView from '../../page-objects/wallet/WalletView';
import SendView from '../../page-objects/Send/RedesignedSendView';
import FooterActions from '../../page-objects/Browser/Confirmations/FooterActions';
import HardwareWalletBottomSheet from '../../page-objects/Ledger/HardwareWalletBottomSheet';
import TabBarComponent from '../../page-objects/wallet/TabBarComponent';
import Assertions from '../../framework/Assertions';
import TestHelpers from '../../helpers';

jest.setTimeout(600000);

const RECIPIENT = '0x0c54fccd2e384b4bb6f2e405bf5cbc15a017aafb';

describe(SmokeLedger, () => {
  it('should send ETH from a Ledger account', async () => {
    await withSpeculosFixtures(
      {
        fixture: new FixtureBuilder().withDefaultFixture().build(),
        startSpeculos: true,
      },
      async ({ speculos }: SpeculosTestSuiteParams) => {
        await importLedgerAccount();

        await WalletView.tapWalletSendButton();
        await TestHelpers.delay(2000);
        await SendView.selectEthereumToken();
        await TestHelpers.delay(1000);
        await SendView.typeInTransactionAmount('0.0001');
        await SendView.pressContinueButton();
        await TestHelpers.delay(2000);
        await SendView.inputRecipientAddress(RECIPIENT);
        await TestHelpers.delay(1000);
        await SendView.pressReviewButton();

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

        await TestHelpers.delay(5000);
        await TabBarComponent.tapActivity();
      },
    );
  });
});
