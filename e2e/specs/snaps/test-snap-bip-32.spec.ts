import { FlaskBuildTests } from '../../tags';
import { loginToApp } from '../../viewHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import Assertions from '../../framework/Assertions';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import TestSnaps from '../../pages/Browser/TestSnaps';

jest.setTimeout(150_000);

describe(FlaskBuildTests('BIP-32 Snap Tests'), () => {
  it('can connect to BIP-32 snap', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withMultiSRPKeyringController().build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await TabBarComponent.tapBrowser();
        await TestSnaps.navigateToTestSnap();

        await TestSnaps.installSnap('connectBip32Button');
      },
    );
  });

  it('can get BIP-32 public key', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withMultiSRPKeyringController().build(),
      },
      async () => {
        await TestSnaps.tapButton('getPublicKeyBip32Button');
        await TestSnaps.checkResultSpan(
          'bip32PublicKeyResultSpan',
          '"0x043e98d696ae15caef75fa8dd204a7c5c08d1272b2218ba3c20feeb4c691eec366606ece56791c361a2320e7fad8bcbb130f66d51c591fc39767ab2856e93f8dfb"',
        );
      },
    );
  });

  it('can sign BIP-32 message using secp256k1', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withMultiSRPKeyringController().build(),
      },
      async () => {
        await TestSnaps.fillMessage('messageSecp256k1Input', 'foo bar');
        await TestSnaps.tapButton('signMessageBip32Secp256k1Button');
        await Assertions.checkIfTextIsDisplayed('Signature request');
        await TestSnaps.approveSignRequest();
        await TestSnaps.checkResultSpan(
          'bip32MessageResultSecp256k1Span',
          '"0x3045022100b3ade2992ea3e5eb58c7550e9bddad356e9554233c8b099ebc3cb418e9301ae2022064746e15ae024808f0ba5d860e44dc4c97e65c8cba6f5ef9ea2e8c819930d2dc"',
        );
      },
    );
  });

  it('can sign BIP-32 message using ed25519', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withMultiSRPKeyringController().build(),
      },
      async () => {
        await TestSnaps.fillMessage('messageEd25519Input', 'foo bar');
        await TestSnaps.tapButton('signMessageBip32ed25519Button');
        await Assertions.checkIfTextIsDisplayed('Signature request');
        await TestSnaps.approveSignRequest();
        await TestSnaps.checkResultSpan(
          'bip32MessageResultEd25519Span',
          '"0xf3215b4d6c59aac7e01b4ceef530d1e2abf4857926b85a81aaae3894505699243768a887b7da4a8c2e0f25196196ba290b6531050db8dc15c252bdd508532a0a"',
        );
      },
    );
  });

  it('can sign BIP-32 message using ed25519Bip32', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withMultiSRPKeyringController().build(),
      },
      async () => {
        await TestSnaps.fillMessage('messageEd25519Bip32Input', 'foo bar');
        await TestSnaps.tapButton('signMessageBip32ed25519Bip32Button');
        await Assertions.checkIfTextIsDisplayed('Signature request');
        await TestSnaps.approveSignRequest();
        await TestSnaps.checkResultSpan(
          'bip32MessageResultEd25519Bip32Span',
          '"0xc279ee3e49f7e392a4e511136c39791e076f9be01d8648f3f1586ecf0f41def1739fa2978f90cfb2da4cf53ccb99405558cffcc4d190199b6949b03b1b8dae05"',
        );
      },
    );
  });

  it('can sign BIP-32 message using secp256k1 and SRP 1', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withMultiSRPKeyringController().build(),
      },
      async () => {
        await TestSnaps.selectInDropdown('bip32EntropyDropDown', 'SRP 1');
        await TestSnaps.fillMessage('messageSecp256k1Input', 'bar baz');
        await TestSnaps.tapButton('signMessageBip32Secp256k1Button');
        await Assertions.checkIfTextIsDisplayed('Signature request');
        await TestSnaps.approveSignRequest();
        await TestSnaps.checkResultSpan(
          'bip32MessageResultSecp256k1Span',
          '"0x3045022100bd7301b5288fcc15e9c19bf548b666356230343a57f4ef0327a8e81f19ac562c022062698ed00a36e9ddd1563e1dc2e357d747bdfb233192ee1597cabb6c7210a6ba"',
        );
      },
    );
  });

  it('can sign BIP-32 message using secp256k1 and SRP 2', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withMultiSRPKeyringController().build(),
      },
      async () => {
        await TestSnaps.selectInDropdown('bip32EntropyDropDown', 'SRP 2');
        await TestSnaps.fillMessage('messageSecp256k1Input', 'bar baz');
        await TestSnaps.tapButton('signMessageBip32Secp256k1Button');
        await Assertions.checkIfTextIsDisplayed('Signature request');
        await TestSnaps.approveSignRequest();
        await TestSnaps.checkResultSpan(
          'bip32MessageResultSecp256k1Span',
          '"0x3045022100ad81b36b28f5f5dd47f45a46b2e7cf42e501d2e9b5768627b0702c100f80eb3c02200a481cbbe22b47b4ea6cd923a7da22952f5b21a0dc52e841dcd08f7af8c74e05"',
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
        await TestSnaps.selectInDropdown('bip32EntropyDropDown', 'Invalid');
        await TestSnaps.fillMessage('messageSecp256k1Input', 'bar baz');
        await TestSnaps.tapButton('signMessageBip32Secp256k1Button');
        await Assertions.checkIfTextIsDisplayed(
          'Entropy source with ID "invalid" not found.',
        );
      },
    );
  });
});
