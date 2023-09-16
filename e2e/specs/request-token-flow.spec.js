'use strict';
import { Smoke } from '../tags';

import SendLinkView from '../pages/SendLinkView';
import RequestPaymentView from '../pages/RequestPaymentView';

import TabBarComponent from '../pages/TabBarComponent';
import WalletActionsModal from '../pages/modals/WalletActionsModal';

import ProtectYourWalletModal from '../pages/modals/ProtectYourWalletModal';
import RequestPaymentModal from '../pages/modals/RequestPaymentModal';

import { loginToApp } from '../viewHelper';
import {
  loadFixture,
  startFixtureServer,
  stopFixtureServer,
} from '../fixtures/fixture-helper';
import FixtureBuilder from '../fixtures/fixture-builder';

const SAI_CONTRACT_ADDRESS = '0x89d24a6b4ccb1b6faa2625fe562bdd9a23260359';

describe(Smoke('Request Token Flow'), () => {
  beforeAll(async () => {
    const fixture = new FixtureBuilder().build();
    fixture.state.user.seedphraseBackedUp = false;
    await startFixtureServer();
    await loadFixture({ fixture });
    await device.launchApp({ delete: true });
  });

  beforeEach(() => {
    jest.setTimeout(150000);
  });

  afterAll(async () => {
    await stopFixtureServer();
  });

  it('should request DAI', async () => {
    await loginToApp();
    await TabBarComponent.tapActions();
    await WalletActionsModal.tapReceiveButton();

    await RequestPaymentModal.tapRequestPaymentButton();
    await RequestPaymentView.isVisible();

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
