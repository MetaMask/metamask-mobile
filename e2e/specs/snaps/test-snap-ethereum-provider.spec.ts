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
import RequestTypes from '../../pages/Browser/Confirmations/RequestTypes';

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
        fixture: new FixtureBuilder().withMultiSRPKeyringController().build(),
        restartDevice: true,
        testSpecificMock: {
          GET: [mockEvents.GET.remoteFeatureFlagsRedesignedConfirmationsFlask],
        },
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
        await TestSnaps.checkResultSpan('ethereumProviderResultSpan', '"0x1"');

        await TestSnaps.tapButton('getAccountsButton');
        await Assertions.checkIfVisible(ConnectBottomSheet.connectButton);
        await ConnectBottomSheet.tapConnectButton();
        await TestHelpers.delay(500);
        await TestSnaps.checkResultSpanIncludes(
          'ethereumProviderResultSpan',
          '"0x5cfe73b6021e818b776b421b1c4db2474086a7e1"',
        );

        // Test `personal_sign`.
        await TestSnaps.fillMessage('personalSignMessageInput', 'foo');
        await TestSnaps.tapButton('personalSignButton');
        await Assertions.checkIfVisible(RequestTypes.PersonalSignRequest);
        await TestSnaps.approveNativeConfirmation();
        await TestSnaps.checkResultSpan(
          'personalSignResultSpan',
          '"0xf63c587cd42e7775e2e815a579f9744ea62944f263b3e69fad48535ba98a5ea107bc878088a99942733a59a89ef1d590eafdb467d59cf76564158d7e78351b751b"',
        );

        // Test `eth_signTypedData_v4`.
        await TestSnaps.fillMessage('signTypedDataMessageInput', 'bar');
        await TestSnaps.tapButton('signTypedDataButton');
        await Assertions.checkIfVisible(RequestTypes.TypedSignRequest);
        await TestSnaps.approveNativeConfirmation();
        await TestSnaps.checkResultSpan(
          'signTypedDataResultSpan',
          '"0x7024dc071a7370eee444b2a3edc08d404dd03393694403cdca864653a7e8dd7c583419293d53602666cbe77faa8819fba04f8c57e95df2d4c0190968eece28021c"',
        );

        // Check other networks.
        await TestSnaps.selectInDropdown('networkDropDown', 'Ethereum');
        await TestSnaps.tapButton('getChainIdButton');
        await TestHelpers.delay(500);
        await TestSnaps.checkResultSpan('ethereumProviderResultSpan', '"0x1"');

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
