import TestHelpers from '../../helpers';
import { FlaskBuildTests } from '../../tags';
import { loginToApp } from '../../viewHelper';
import FixtureBuilder from '../../fixtures/fixture-builder';
import {
  loadFixture,
  startFixtureServer,
  stopFixtureServer,
} from '../../fixtures/fixture-helper';
import { getFixturesServerPort } from '../../fixtures/utils';
import FixtureServer from '../../fixtures/fixture-server';
import Assertions from '../../utils/Assertions';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import BrowserView from '../../pages/Browser/BrowserView';
import TestSnaps from '../../pages/Browser/TestSnaps';

const fixtureServer = new FixtureServer();

describe(FlaskBuildTests('BIP-32 Snap Tests'), () => {
  beforeAll(async () => {
    await TestHelpers.reverseServerPort();
    const fixture = new FixtureBuilder()
      .withImportedHdKeyringAndTwoDefaultAccountsOneImportedHdAccountKeyringController()
      .build();
    await startFixtureServer(fixtureServer);
    await loadFixture(fixtureServer, { fixture });
    await TestHelpers.launchApp({
      launchArgs: { fixtureServerPort: `${getFixturesServerPort()}` },
    });
    await loginToApp();

    // Navigate to test snaps URL once for all tests
    await TabBarComponent.tapBrowser();
    await TestSnaps.navigateToTestSnap();
    await TestHelpers.delay(3500); // Wait for page to load
    await Assertions.checkIfVisible(BrowserView.browserScreenID);
  });

  afterAll(async () => {
    await stopFixtureServer(fixtureServer);
  });

  beforeEach(() => {
    jest.setTimeout(150000);
  });

  it('can connect to BIP-32 snap', async () => {
    await TestSnaps.installSnap('connectBip32Button');
  });

  it('can get BIP-32 public key', async () => {
    await TestSnaps.tapButton('getPublicKeyBip32Button');
    await TestHelpers.delay(3000);
    await TestSnaps.checkResultSpan(
      'bip32PublicKeyResultSpan',
      '"0x046d718eee8a4e85aac6b6a02c802a60e4d13981ab5cf7d620466c9d23fe24d9cfb2548ed7bdb658ef24d119b70cf49e05a111e8054e53a8d0548e10e684afc40b"',
    );
  });

  it('can sign BIP-32 message using secp256k1', async () => {
    await TestSnaps.fillMessage('messageSecp256k1Input', 'foo');
    await TestSnaps.tapButton('signMessageBip32Secp256k1Button');
    await Assertions.checkIfTextIsDisplayed('Signature request');
    await TestSnaps.approveSignRequest();
    await TestSnaps.checkResultSpan(
      'bip32MessageResultSecp256k1Span',
      '"0x304402204b206e3fa1620727c9699ac30869b9c53b3084375531a20196328776b7a315ac02207320be06767c377a1a44ec3729e91455ec700c7c486697c010e7c672a4c3fc6e"',
    );
  });

  it('can sign BIP-32 message using ed25519', async () => {
    await TestSnaps.fillMessage('messageEd25519Input', 'foo');
    await TestSnaps.tapButton('signMessageBip32ed25519Button');
    await Assertions.checkIfTextIsDisplayed('Signature request');
    await TestSnaps.approveSignRequest();
    await TestSnaps.checkResultSpan(
      'bip32MessageResultEd25519Span',
      '"0x52b797a80452402e93d1a53a972a5d22ae77c88c0883233839849f142ab6cef69e91500c4109ff40216cc4327d1914ab05facce372817db532463a38f225e408"',
    );
  });

  it.skip('can sign BIP-32 message using ed25519Bip32', async () => {
    await TestSnaps.fillMessage('messageEd25519Bip32Input', 'foo');
    await TestSnaps.tapButton('signMessageBip32ed25519Bip32Button');
    await Assertions.checkIfTextIsDisplayed('Signature request');
    await TestSnaps.approveSignRequest();
    await TestSnaps.checkResultSpan('bip32MessageResultEd25519Bip32Span', '""');
  });

  it('can sign BIP-32 message using secp256k1 and SRP 1', async () => {
    await TestSnaps.selectEntropySource(
      'bip32EntropyDropDown',
      '01JX9NJ15HPNS6RRRYBCKDK33R',
    );
    await TestSnaps.fillMessage('messageSecp256k1Input', 'foo');
    await TestSnaps.tapButton('signMessageBip32Secp256k1Button');
    await Assertions.checkIfTextIsDisplayed('Signature request');
    await TestSnaps.approveSignRequest();
    await TestSnaps.checkResultSpan(
      'bip32MessageResultSecp256k1Span',
      '"0x304402204b206e3fa1620727c9699ac30869b9c53b3084375531a20196328776b7a315ac02207320be06767c377a1a44ec3729e91455ec700c7c486697c010e7c672a4c3fc6e"',
    );
  });

  it('can sign BIP-32 message using secp256k1 and SRP 2', async () => {
    await TestSnaps.selectEntropySource(
      'bip32EntropyDropDown',
      '01JX9NZWRAVQKES02TWSN8GD91',
    );
    await TestSnaps.fillMessage('messageSecp256k1Input', 'foo');
    await TestSnaps.tapButton('signMessageBip32Secp256k1Button');
    await Assertions.checkIfTextIsDisplayed('Signature request');
    await TestSnaps.approveSignRequest();
    await TestSnaps.checkResultSpan(
      'bip32MessageResultSecp256k1Span',
      '"0x30430220458e02536d6f84029ac13401ac59b9d241255d2e0f58f1c000da7e5d77a76e25021f1a14788d550e9d6b5265a70b17473d18a96aa5c3866efdac87c8bbc6f1db6f"',
    );
  });

  it('fails when choosing the invalid entropy source', async () => {
    await TestSnaps.selectEntropySource('bip32EntropyDropDown', 'Invalid');
    await TestSnaps.fillMessage('messageSecp256k1Input', 'foo');
    await TestSnaps.tapButton('signMessageBip32Secp256k1Button');
    await Assertions.checkIfTextIsDisplayed(
      'Entropy source with ID "invalid" not found.',
    );
  });
});
