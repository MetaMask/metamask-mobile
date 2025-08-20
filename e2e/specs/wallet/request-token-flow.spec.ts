import { SmokeWalletPlatform } from '../../tags';
import RequestPaymentModal from '../../pages/Receive/RequestPaymentModal';
import SendLinkView from '../../pages/Receive/SendLinkView';
import PaymentRequestQrBottomSheet from '../../pages/Receive/PaymentRequestQrBottomSheet';
import RequestPaymentView from '../../pages/Receive/RequestPaymentView';
import WalletView from '../../pages/wallet/WalletView';
import ProtectYourWalletModal from '../../pages/Onboarding/ProtectYourWalletModal';
import { loginToApp } from '../../viewHelper';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import Assertions from '../../framework/Assertions';
import { startMockServer } from '../../api-mocking/mock-server';
import { getMockServerPort } from '../../framework/fixtures/FixtureUtils';

const SAI_CONTRACT_ADDRESS: string =
  '0x89d24a6b4ccb1b6faa2625fe562bdd9a23260359';

describe(
  SmokeWalletPlatform('Request Token Flow with Unprotected Wallet'),
  (): void => {
    it('should complete request token flow from action button to wallet protection modal', async (): Promise<void> => {
      const mockServerPort = getMockServerPort();
      const mockServer = await startMockServer({}, mockServerPort);
      await withFixtures(
        {
          fixture: new FixtureBuilder()
            .withKeyringController()
            .withSeedphraseBackedUpDisabled()
            .build(),
          restartDevice: true,
          mockServerInstance: mockServer,
        },
        async (): Promise<void> => {
          await loginToApp();
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
