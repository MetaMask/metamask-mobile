import TestHelpers from '../../helpers';
import { FlaskBuildTests } from '../../tags';
import { loginToApp } from '../../viewHelper';
import FixtureBuilder from '../../fixtures/fixture-builder';
import { withFixtures } from '../../fixtures/fixture-helper';
import Assertions from '../../utils/Assertions';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import BrowserView from '../../pages/Browser/BrowserView';
import TestSnaps from '../../pages/Browser/TestSnaps';
import ConnectBottomSheet from '../../pages/Browser/ConnectBottomSheet';
import { mockEvents } from '../../api-mocking/mock-config/mock-events';
import FooterActions from '../../pages/Browser/Confirmations/FooterActions';
import ConfirmationUITypes from '../../pages/Browser/Confirmations/ConfirmationUITypes';

describe(FlaskBuildTests('Ethereum Provider Snap Tests'), () => {
  beforeAll(async () => {
    await TestHelpers.reverseServerPort();
  });

  beforeEach(() => {
    jest.setTimeout(150000);
  });

  it('can use the Ethereum provider', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
        testSpecificMock: { GET: [mockEvents.GET.remoteFeatureFlagsRedesignedConfirmationsFlask] },
      },
      async () => {
        await loginToApp();

        // Navigate to test snaps URL once for all tests
        await TabBarComponent.tapBrowser();
        await TestSnaps.navigateToTestSnap();
        await TestHelpers.delay(3500); // Wait for page to load
        await Assertions.checkIfVisible(BrowserView.browserScreenID);

        await TestSnaps.installSnap('connectEthereumProviderButton');

        await TestSnaps.tapButton('getChainIdButton');
        await TestHelpers.delay(500);
        await TestSnaps.checkResultSpan(
          'ethereumProviderResultSpan',
          '"0x1"',
        );

        await TestSnaps.tapButton('getAccountsButton');
        await Assertions.checkIfVisible(
          ConnectBottomSheet.connectButton,
        );
        await ConnectBottomSheet.tapConnectButton();
        await TestHelpers.delay(500);
        await TestSnaps.checkResultSpanIncludes(
          'ethereumProviderResultSpan',
          '"0x76cf1CdD1fcC252442b50D6e97207228aA4aefC3"',
        );

        // Test `personal_sign`.
        await TestSnaps.fillMessage('personalSignMessageInput', 'foo');
        await TestSnaps.tapButton('personalSignButton');
        await Assertions.checkIfVisible(
          ConfirmationUITypes.ModalConfirmationContainer,
        );
        await FooterActions.tapConfirmButton();
        await TestSnaps.checkResultSpan(
          'personalSignResultSpan',
          '"0xc87c81cc8592936ec9dedfb6040080a0ac100c713231fd3b2ee93942a175efb639ccda7918bd14cbe8ef2f5ec917bba1a35744c06d2d4ff3a8a6b077c3e2a1381c"',
        );

        // Test `eth_signTypedData_v4`.
        await TestSnaps.fillMessage('signTypedDataMessageInput', 'bar');
        await TestSnaps.tapButton('signTypedDataButton');
        await Assertions.checkIfVisible(
          ConfirmationUITypes.ModalConfirmationContainer,
        );
        await FooterActions.tapConfirmButton();
        await TestSnaps.checkResultSpan(
          'signTypedDataResultSpan',
          '"0x85094c93975d31ceddddf2894fc7bb96ce6cfdac2559a72417bc214e6e9f24195fa708010da7a52b5df6c75595d0e03f90749b2b5bfbd5605ca799ceb91a36681b"',
        );

        // Check other networks.
        await TestSnaps.selectInDropdown('networkDropDown', 'Ethereum');
        await TestSnaps.tapButton('getChainIdButton');
        await TestHelpers.delay(500);
        await TestSnaps.checkResultSpan(
          'ethereumProviderResultSpan',
          '"0x1"',
        );

        await TestSnaps.selectInDropdown('networkDropDown', 'Linea');
        await TestSnaps.tapButton('getChainIdButton');
        await TestHelpers.delay(500);
        await TestSnaps.checkResultSpan(
          'ethereumProviderResultSpan',
          '"0xe708"',
        );

        await TestSnaps.selectInDropdown('networkDropDown', 'Sepolia');
        await TestSnaps.tapButton('getChainIdButton');
        await TestHelpers.delay(500);
        await TestSnaps.checkResultSpan(
          'ethereumProviderResultSpan',
          '"0xaa36a7"',
        );
      },
    );
  });
});
