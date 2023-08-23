'use strict';
import { Smoke } from '../tags';

import SendLinkView from '../pages/SendLinkView';
import RequestPaymentView from '../pages/RequestPaymentView';

import TabBarComponent from '../pages/TabBarComponent';
import WalletActionsModal from '../pages/modals/WalletActionsModal';

import ProtectYourWalletModal from '../pages/modals/ProtectYourWalletModal';
import RequestPaymentModal from '../pages/modals/RequestPaymentModal';

import { CreateNewWallet } from '../viewHelper';

const SAI_CONTRACT_ADDRESS = '0x89d24a6b4ccb1b6faa2625fe562bdd9a23260359';

describe(Smoke('Request Token Flow'), () => {
  beforeEach(() => {
    jest.setTimeout(150000);
  });

  it('should create new wallet', async () => {
    await CreateNewWallet();
  });

  it('should go to the request view', async () => {
    await TabBarComponent.tapActions();
    await WalletActionsModal.tapReceiveButton();

    await RequestPaymentModal.tapRequestPaymentButton();
    await RequestPaymentView.tapETH();

    await RequestPaymentView.isRequestTitleVisible();

    await RequestPaymentView.tapBackButton();

    await RequestPaymentView.isVisible();
  });

  it('should request DAI', async () => {
    // Search by SAI contract address
    await RequestPaymentView.searchForToken(SAI_CONTRACT_ADDRESS);
    await RequestPaymentView.isTokenVisibleInSearchResults('SAI');

    await RequestPaymentView.searchForToken('DAI');
    await RequestPaymentView.tapOnToken('DAI');
    await RequestPaymentView.typeInTokenAmount(5.5);

    await SendLinkView.isVisible();
    // Tap on QR Code Button
    await SendLinkView.tapQRCodeButton();
    // Check that the QR code is visible
    await SendLinkView.isQRModalVisible();
    // Close QR Code
    await SendLinkView.tapQRCodeCloseButton();
    // Close view
    await SendLinkView.tapCloseSendLinkButton();
    // Ensure protect your wallet modal is visible
    await ProtectYourWalletModal.isVisible();
  });
});
