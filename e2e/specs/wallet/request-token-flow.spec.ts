'use strict';
import { SmokeWalletPlatform } from '../../tags';
import RequestPaymentModal from '../../pages/Receive/RequestPaymentModal';
import SendLinkView from '../../pages/Receive/SendLinkView';
import PaymentRequestQrBottomSheet from '../../pages/Receive/PaymentRequestQrBottomSheet';
import RequestPaymentView from '../../pages/Receive/RequestPaymentView';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import WalletActionsBottomSheet from '../../pages/wallet/WalletActionsBottomSheet';
import ProtectYourWalletModal from '../../pages/Onboarding/ProtectYourWalletModal';
import { loginToApp } from '../../viewHelper';
import { withFixtures } from '../../fixtures/fixture-helper';
import FixtureBuilder from '../../fixtures/fixture-builder';
import TestHelpers from '../../helpers';
import WalletView from '../../pages/wallet/WalletView';
import Assertions from '../../utils/Assertions';

const SAI_CONTRACT_ADDRESS: string =
  '0x89d24a6b4ccb1b6faa2625fe562bdd9a23260359';

describe(
  SmokeWalletPlatform('Request Token Flow with Unprotected Wallet'),
  (): void => {
    beforeAll(async (): Promise<void> => {
      jest.setTimeout(200000);
      await TestHelpers.reverseServerPort();
    });

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
          await Assertions.checkIfVisible(WalletView.container);
          // Request asset from Action button
          await TabBarComponent.tapActions();
          await WalletActionsBottomSheet.tapReceiveButton();
          await RequestPaymentModal.tapRequestPaymentButton();
          await Assertions.checkIfVisible(
            RequestPaymentView.requestPaymentContainer,
          );

          // Search for SAI by contract
          await RequestPaymentView.searchForToken(SAI_CONTRACT_ADDRESS);
          await Assertions.checkIfTextIsDisplayed('SAI');

          // Search DAI
          await RequestPaymentView.searchForToken('D');
          await RequestPaymentView.tapOnToken('Dai Stablecoin');

          // Request DAI amount
          await RequestPaymentView.typeInTokenAmount(5.5);
          await Assertions.checkIfVisible(SendLinkView.container);

          // See DAI request QR code
          await SendLinkView.tapQRCodeButton();
          await Assertions.checkIfVisible(
            PaymentRequestQrBottomSheet.container,
          );

          // Close request
          await PaymentRequestQrBottomSheet.tapCloseButton();
          await SendLinkView.tapCloseSendLinkButton();

          // See protect your wallet modal
          await Assertions.checkIfVisible(ProtectYourWalletModal.container);
        },
      );
    });
  },
);
