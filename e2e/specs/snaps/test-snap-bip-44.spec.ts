import { FlaskBuildTests } from '../../tags';
import { loginToApp } from '../../viewHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import Assertions from '../../framework/Assertions';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import TestSnaps from '../../pages/Browser/TestSnaps';

jest.setTimeout(150_000);

describe(FlaskBuildTests('BIP-44 Snap Tests'), () => {
  it('can connect to BIP-44 snap', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withMultiSRPKeyringController().build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await TabBarComponent.tapBrowser();
        await TestSnaps.navigateToTestSnap();

        await TestSnaps.installSnap('connectBip44Button');
      },
    );
  });

  it('can get BIP-44 public key', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withMultiSRPKeyringController().build(),
      },
      async () => {
        await TestSnaps.tapButton('getPublicKeyBip44Button');
        await TestSnaps.checkResultSpan(
          'bip44ResultSpan',
          '"0x86debb44fb3a984d93f326131d4c1db0bc39644f1a67b673b3ab45941a1cea6a385981755185ac4594b6521e4d1e08d1"',
        );
      },
    );
  });

  it('can sign a BIP-44 message', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withMultiSRPKeyringController().build(),
      },
      async () => {
        await TestSnaps.fillMessage('messageBip44Input', '1234');
        await TestSnaps.tapButton('signMessageBip44Button');
        await TestSnaps.approveSignRequest();
        await TestSnaps.checkResultSpan(
          'bip44SignResultSpan',
          '"0xa41ab87ca50606eefd47525ad90294bbe44c883f6bc53655f1b8a55aa8e1e35df216f31be62e52c7a1faa519420e20810162e07dedb0fde2a4d997ff7180a78232ecd8ce2d6f4ba42ccacad33c5e9e54a8c4d41506bdffb2bb4c368581d8b086"',
        );
      },
    );
  });

  it('can sign with entropy from SRP 1', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withMultiSRPKeyringController().build(),
      },
      async () => {
        await TestSnaps.selectInDropdown('bip44EntropyDropDown', 'SRP 1');
        await TestSnaps.fillMessage('messageBip44Input', 'foo bar');
        await TestSnaps.tapButton('signMessageBip44Button');
        await TestSnaps.approveSignRequest();
        await TestSnaps.checkResultSpan(
          'bip44SignResultSpan',
          '"0x978f82799b8f48cb78ac56153a34d360873c976fd5ec84f7a5291382dde52d6cb478cadd94153970e58e5205c054cdda0071be0551b729d79bd417f7b0fc2b0c51071ca4771c9b2d8238d7d982bc5ec9256645287402348ca0f89202fb1e0773"',
        );
      },
    );
  });

  it('can sign with entropy from SRP 2', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withMultiSRPKeyringController().build(),
      },
      async () => {
        await TestSnaps.selectInDropdown('bip44EntropyDropDown', 'SRP 2');
        await TestSnaps.fillMessage('messageBip44Input', 'foo bar');
        await TestSnaps.tapButton('signMessageBip44Button');
        await TestSnaps.approveSignRequest();
        await TestSnaps.checkResultSpan(
          'bip44SignResultSpan',
          '"0xa8fdc184ded6d9a1b16d2d4070470720e4a946c9899ceb5165c05f9a8c4b026e8f630d6bdb60151f9e84b3c415c4b46c11bc2571022c8391b07faedc0d8c258d532d34c33149c5fc29e17c310437dc47e8afb43b2c55bd47b1b09ea295f7dcb3"',
        );
      },
    );
  });

  it('fails when choosing the invalid entropy source', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withMultiSRPKeyringController().build(),
      },
      async () => {
        await TestSnaps.selectInDropdown('bip44EntropyDropDown', 'Invalid');
        await TestSnaps.fillMessage('messageBip44Input', 'foo bar');
        await TestSnaps.tapButton('signMessageBip44Button');
        await Assertions.expectTextDisplayed(
          'Entropy source with ID "invalid" not found.',
        );
      },
    );
  });
});
