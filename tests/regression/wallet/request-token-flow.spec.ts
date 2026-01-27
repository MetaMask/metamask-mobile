import { RegressionWalletPlatform } from '../../../e2e/tags';
import RequestPaymentModal from '../../../e2e/pages/Receive/RequestPaymentModal.ts';
import SendLinkView from '../../../e2e/pages/Receive/SendLinkView.ts';
import PaymentRequestQrBottomSheet from '../../../e2e/pages/Receive/PaymentRequestQrBottomSheet.ts';
import RequestPaymentView from '../../../e2e/pages/Receive/RequestPaymentView.ts';
import WalletView from '../../../e2e/pages/wallet/WalletView.ts';
import ProtectYourWalletModal from '../../../e2e/pages/Onboarding/ProtectYourWalletModal.ts';
import { loginToApp } from '../../../e2e/viewHelper.ts';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.ts';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.ts';
import Assertions from '../../framework/Assertions.ts';

const SAI_CONTRACT_ADDRESS: string =
  '0x89d24a6b4ccb1b6faa2625fe562bdd9a23260359';

describe.skip(
  RegressionWalletPlatform('Request Token Flow with Unprotected Wallet'),
  (): void => {
    it('should complete request token flow from action button to wallet protection modal', async (): Promise<void> => {
      await withFixtures(
        {
          fixture: new FixtureBuilder()
            .withKeyringController()
            .withSeedphraseBackedUpDisabled()
            .build(),
          restartDevice: true,
        },
        async (): Promise<void> => {
          await loginToApp();
          await device.disableSynchronization();
          await Assertions.expectElementToBeVisible(WalletView.container);
          // Request asset from main Receive button
          await WalletView.tapWalletReceiveButton();
          await RequestPaymentModal.tapRequestPaymentButton();
          await Assertions.expectElementToBeVisible(
            RequestPaymentView.requestPaymentContainer,
          );

          // Search for SAI by contract
          await RequestPaymentView.searchForToken(SAI_CONTRACT_ADDRESS);
          await Assertions.expectTextDisplayed('SAI');

          // Search DAI
          await RequestPaymentView.searchForToken('D');
          await RequestPaymentView.tapOnToken('Dai Stablecoin');

          // Request DAI amount
          await RequestPaymentView.typeInTokenAmount(5.5);
          await Assertions.expectElementToBeVisible(SendLinkView.container);

          // See DAI request QR code
          await SendLinkView.tapQRCodeButton();
          await Assertions.expectElementToBeVisible(
            PaymentRequestQrBottomSheet.container,
          );

          // Close request
          await PaymentRequestQrBottomSheet.tapCloseButton();
          await SendLinkView.tapCloseSendLinkButton();

          // See protect your wallet modal
          await Assertions.expectElementToBeVisible(
            ProtectYourWalletModal.container,
          );
        },
      );
    });
  },
);
