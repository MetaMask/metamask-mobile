'use strict';
import { SmokeCore } from '../../tags';
import SendLinkView from '../../pages/SendLinkView';
import RequestPaymentView from '../../pages/RequestPaymentView';
import TabBarComponent from '../../pages/TabBarComponent';
import WalletActionsModal from '../../pages/modals/WalletActionsModal';
import ProtectYourWalletModal from '../../pages/modals/ProtectYourWalletModal';
import RequestPaymentModal from '../../pages/modals/RequestPaymentModal';
import { loginToApp } from '../../viewHelper';
import {
  loadFixture,
  startFixtureServer,
  stopFixtureServer,
} from '../../fixtures/fixture-helper';
import FixtureBuilder from '../../fixtures/fixture-builder';
import TestHelpers from '../../helpers';
import WalletView from '../../pages/wallet/WalletView';
import { getFixturesServerPort } from '../../fixtures/utils';
import FixtureServer from '../../fixtures/fixture-server';
import Assertions from '../../utils/Assertions';

const SAI_CONTRACT_ADDRESS = '0x89d24a6b4ccb1b6faa2625fe562bdd9a23260359';
const fixtureServer = new FixtureServer();

describe(SmokeCore('Request Token Flow with Unprotected Wallet'), () => {
  beforeAll(async () => {
    await TestHelpers.reverseServerPort();
    const fixture = new FixtureBuilder().withKeyringController().build();
    fixture.state.user.seedphraseBackedUp = false;
    await startFixtureServer(fixtureServer);
    await loadFixture(fixtureServer, { fixture });
    await device.launchApp({
      permissions: { notifications: 'YES' },
      launchArgs: { fixtureServerPort: `${getFixturesServerPort()}` },
    });
  });

  beforeEach(() => {
    jest.setTimeout(200000);
  });

  afterAll(async () => {
    await stopFixtureServer(fixtureServer);
  });

  it('should request asset from Action button', async () => {
    await loginToApp();
    await Assertions.checkIfVisible(WalletView.container);
    await TabBarComponent.tapActions();
    await WalletActionsModal.tapReceiveButton();
    await RequestPaymentModal.tapRequestPaymentButton();
    await RequestPaymentView.isVisible();
  });

  it('should search for SAI by contract', async () => {
    await RequestPaymentView.searchForToken(SAI_CONTRACT_ADDRESS);
    await RequestPaymentView.isTokenVisibleInSearchResults('SAI');
  });

  it('should search DAI', async () => {
    await RequestPaymentView.searchForToken('DAI');
    await RequestPaymentView.tapOnToken('DAI');
  });

  it('should request DAI amount', async () => {
    await RequestPaymentView.typeInTokenAmount(5.5);
    await SendLinkView.isVisible();
  });

  it('should see DAI request QR code', async () => {
    await SendLinkView.tapQRCodeButton();
    await SendLinkView.isQRModalVisible();
  });

  it('should close request', async () => {
    await SendLinkView.tapQRCodeCloseButton();
    await SendLinkView.tapCloseSendLinkButton();
  });

  it('should see protect your wallet modal', async () => {
    await Assertions.checkIfVisible(ProtectYourWalletModal.container);
  });
});
