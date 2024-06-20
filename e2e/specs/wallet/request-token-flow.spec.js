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
import WalletView from '../../pages/WalletView';
import { getFixturesServerPort } from '../../fixtures/utils';
import FixtureServer from '../../fixtures/fixture-server';
import Assertions from '../../utils/Assertions';

const SAI_CONTRACT_ADDRESS = '0x89d24a6b4ccb1b6faa2625fe562bdd9a23260359';
const fixtureServer = new FixtureServer();

describe(SmokeCore('Request Token Flow with Unprotected Wallet'), () => {
  beforeAll(async () => {
    await TestHelpers.reverseServerPort();
    const fixture = new FixtureBuilder()
      .withKeyringController({
        keyrings: [
          {
            type: 'HD Key Tree',
            accounts: ['0x37cc5ef6bfe753aeaf81f945efe88134b238face'],
          },
          { type: 'QR Hardware Wallet Device', accounts: [] },
        ],
        vault:
          '{"cipher":"T+MXWPPwXOh8RLxpryUuoFCObwXqNQdwak7FafAoVeXOehhpuuUDbjWiHkeVs9slsy/uzG8z+4Va+qyz4dlRnd/Gvc/2RbHTAb/LG1ECk1rvLZW23JPGkBBVAu36FNGCTtT+xrF4gRzXPfIBVAAgg40YuLJWkcfVty6vGcHr3R3/9gpsqs3etrF5tF4tHYWPEhzhhx6HN6Tr4ts3G9sqgyEhyxTLCboAYWp4lsq2iTEl1vQ6T/UyBRNhfDj8RyQMF6hwkJ0TIq2V+aAYkr5NJguBBSi0YKPFI/SGLrin9/+d66gcOSFhIH0GhUbez3Yf54852mMtvOH8Vj7JZc664ukOvEdJIpvCw1CbtA9TItyVApkjQypLtE+IdV3sT5sy+v0mK7Xc054p6+YGiV8kTiTG5CdlI4HkKvCOlP9axwXP0aRwc4ffsvp5fKbnAVMf9+otqmOmlA5nCKdx4FOefTkr/jjhMlTGV8qUAJ2c6Soi5X02fMcrhAfdUtFxtUqHovOh3KzOe25XhjxZ6KCuix8OZZiGtbNDu3xJezPc3vzkTFwF75ubYozLDvw8HzwI+D5Ifn0S3q4/hiequ6NGiR3Dd0BIhWODSvFzbaD7BKdbgXhbJ9+3FXFF9Xkp74msFp6o7nLsx02ywv/pmUNqQhwtVBfoYhcFwqZZQlOPKcH8otguhSvZ7dPgt7VtUuf8gR23eAV4ffVsYK0Hll+5n0nZztpLX4jyFZiV/kSaBp+D2NZM2dnQbsWULKOkjo/1EpNBIjlzjXRBg5Ui3GgT3JXUDx/2GmJXceacrbMcos3HC2yfxwUTXC+yda4IrBx/81eYb7sIjEVNxDuoBxNdRLKoxwmAJztxoQLF3gRexS45QKoFZZ0kuQ9MqLyY6HDK","iv":"3271713c2b35a7c246a2a9b263365c3d","keyMetadata":{"algorithm":"PBKDF2","params":{"iterations":5000}},"lib":"original","salt":"l4e+sn/jdsaofDWIB/cuGQ=="}',
      })
      .build();
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
    await WalletView.isVisible();
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
