import type { Mockttp } from 'mockttp';
import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeSnaps } from '../../tags.js';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper.js';
import { confirmationFeatureFlags } from '../../api-mocking/mock-responses/feature-flags-mocks.js';
import Assertions from '../../framework/Assertions.js';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.js';
import ConnectBottomSheet from '../../page-objects/Browser/ConnectBottomSheet.js';
import RequestTypes from '../../page-objects/Browser/Confirmations/RequestTypes.js';
import TestSnaps from '../../page-objects/Browser/TestSnaps.js';
import { loginAndOpenTestSnaps } from '../../flows/snaps.flow.js';
import { mockGenesisBlocks } from '../../smoke/snaps/mocks.js';
import { withSnapsFixtures } from './helpers/snap-smoke.helpers.js';

const multiSrpFixture = new FixtureBuilder()
  .withMultiSRPKeyringController()
  .build();

appiumTest.describe(SmokeSnaps('Ethereum Provider Snap Tests'), () => {
  appiumTest(
    'can use the Ethereum provider',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withSnapsFixtures(
        currentDeviceDetails,
        {
          fixture: multiSrpFixture,
          testSpecificMock: async (mockServer: Mockttp) => {
            await setupRemoteFeatureFlagsMock(
              mockServer,
              Object.assign({}, ...confirmationFeatureFlags),
            );
            await mockGenesisBlocks(mockServer);
          },
        },
        async () => {
          await loginAndOpenTestSnaps();
          await TestSnaps.installSnap('connectEthereumProviderButton');

          await TestSnaps.tapButton('getChainIdButton');
          await TestSnaps.checkResultSpan(
            'ethereumProviderResultSpan',
            '"0x1"',
          );

          await TestSnaps.tapButton('getAccountsButton');
          await Assertions.expectElementToBeVisible(
            ConnectBottomSheet.connectButton,
          );
          await ConnectBottomSheet.tapConnectButton();
          await TestSnaps.checkResultSpanIncludes(
            'ethereumProviderResultSpan',
            '"0x5cfe73b6021e818b776b421b1c4db2474086a7e1"',
          );

          await TestSnaps.fillMessage('personalSignMessageInput', 'foo');
          await TestSnaps.tapButton('personalSignButton');
          await Assertions.expectElementToBeVisible(
            RequestTypes.PersonalSignRequest,
          );
          await TestSnaps.approveNativeConfirmation();
          await TestSnaps.checkResultSpan(
            'personalSignResultSpan',
            '"0xf63c587cd42e7775e2e815a579f9744ea62944f263b3e69fad48535ba98a5ea107bc878088a99942733a59a89ef1d590eafdb467d59cf76564158d7e78351b751b"',
          );

          await TestSnaps.fillMessage('signTypedDataMessageInput', 'bar');
          await TestSnaps.tapButton('signTypedDataButton');
          await Assertions.expectElementToBeVisible(
            RequestTypes.TypedSignRequest,
          );
          await TestSnaps.approveNativeConfirmation();
          await TestSnaps.checkResultSpan(
            'signTypedDataResultSpan',
            '"0x7024dc071a7370eee444b2a3edc08d404dd03393694403cdca864653a7e8dd7c583419293d53602666cbe77faa8819fba04f8c57e95df2d4c0190968eece28021c"',
          );

          await TestSnaps.selectInDropdown('networkDropDown', 'Ethereum');
          await TestSnaps.tapButton('getGenesisHashButton');
          await TestSnaps.checkResultSpanIncludes(
            'ethereumProviderResultSpan',
            '"0xd4e56740f876aef8c010b86a40d5f56745a118d0906a34e69aec8c0db1cb8fa3"',
          );

          await TestSnaps.selectInDropdown('networkDropDown', 'Linea');
          await TestSnaps.tapButton('getGenesisHashButton');
          await TestSnaps.checkResultSpanIncludes(
            'ethereumProviderResultSpan',
            '"0xb6762a65689107b2326364aefc18f94cda413209fab35c00d4af51eaa20ffbc6"',
          );

          await TestSnaps.selectInDropdown('networkDropDown', 'Sepolia');
          await TestSnaps.tapButton('getGenesisHashButton');
          await TestSnaps.checkResultSpanIncludes(
            'ethereumProviderResultSpan',
            '"0x25a5cc106eea7138acab33231d7160d69cb777ee0c2c553fcddf5138993e6dd9"',
          );
        },
      );
    },
  );
});
