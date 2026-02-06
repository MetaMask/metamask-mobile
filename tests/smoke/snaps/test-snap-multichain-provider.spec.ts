import { FlaskBuildTests } from '../../../e2e/tags';
import { loginToApp, navigateToBrowserView } from '../../../e2e/viewHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import Assertions from '../../framework/Assertions';
import TestSnaps from '../../../e2e/pages/Browser/TestSnaps';
import ConnectBottomSheet from '../../../e2e/pages/Browser/ConnectBottomSheet';
import RequestTypes from '../../../e2e/pages/Browser/Confirmations/RequestTypes';
import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper';
import { confirmationFeatureFlags } from '../../api-mocking/mock-responses/feature-flags-mocks';
import { mockGenesisBlocks } from './mocks';

jest.setTimeout(150_000);

describe(FlaskBuildTests('Multichain Provider Snap Tests'), () => {
  it('can use the Multichain provider', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withMultiSRPKeyringController().build(),
        restartDevice: true,
        skipReactNativeReload: true,
        testSpecificMock: async (mockServer: Mockttp) => {
          await setupRemoteFeatureFlagsMock(
            mockServer,
            Object.assign({}, ...confirmationFeatureFlags),
          );
          await mockGenesisBlocks(mockServer);
        },
      },
      async () => {
        await loginToApp();

        // Navigate to test snaps URL once for all tests
        await navigateToBrowserView();
        await TestSnaps.navigateToTestSnap();

        await TestSnaps.installSnap('connectMultichainProviderButton');

        await TestSnaps.tapButton('sendCreateSessionButton');

        await Assertions.expectElementToBeVisible(
          ConnectBottomSheet.connectButton,
        );
        await ConnectBottomSheet.tapConnectButton();

        const chains = [
          {
            name: 'Ethereum' as const,
            chainId: '0x1',
            genesisHash:
              '0xd4e56740f876aef8c010b86a40d5f56745a118d0906a34e69aec8c0db1cb8fa3',
            account: 'eip155:1:0x5cfe73b6021e818b776b421b1c4db2474086a7e1',
            signMessageSignature:
              '"0xf63c587cd42e7775e2e815a579f9744ea62944f263b3e69fad48535ba98a5ea107bc878088a99942733a59a89ef1d590eafdb467d59cf76564158d7e78351b751b"',
            signTypedDataSignature:
              '"0x7024dc071a7370eee444b2a3edc08d404dd03393694403cdca864653a7e8dd7c583419293d53602666cbe77faa8819fba04f8c57e95df2d4c0190968eece28021c"',
          },
          {
            name: 'Sepolia' as const,
            chainId: '0xaa36a7',
            genesisHash:
              '0x25a5cc106eea7138acab33231d7160d69cb777ee0c2c553fcddf5138993e6dd9',
            account:
              'eip155:11155111:0x5cfe73b6021e818b776b421b1c4db2474086a7e1',
            signMessageSignature:
              '"0xf63c587cd42e7775e2e815a579f9744ea62944f263b3e69fad48535ba98a5ea107bc878088a99942733a59a89ef1d590eafdb467d59cf76564158d7e78351b751b"',
            signTypedDataSignature:
              '"0x35bb09b05a3f7e4a0965fbf35b48d9d51efa5f7d030bdf4c18f4ad958941d20213a3e0ef731c1ee7619248331f5c259829581da38e9112624c1f8639e954572d1c"',
          },
          {
            name: 'Solana' as const,
            genesisHash: '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
            account:
              'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp:4tE76eixEgyJDrdykdWJR1XBkzUk4cLMvqjR2xVJUxer',
            signMessageSignature:
              '"5RH4BJB99CvWqPhXAtUwLQGJePeeXFLQKbztFbiasAe4mEGmr4moV2g2XEEwWMSsZKQGiV1UHxVGuVMenXAcfKfi"',
          },
        ];

        for (const chain of chains) {
          await TestSnaps.selectInDropdown(
            'multichainNetworkDropdown',
            chain.name,
          );

          if (chain.chainId) {
            // Test getting chain ID.
            await TestSnaps.tapButton('sendMultichainChainIdButton');
            await TestSnaps.checkResultSpanIncludes(
              'multichainProviderResultSpan',
              chain.chainId,
            );
          }

          // Test getting genesis hash.
          await TestSnaps.tapButton('sendMultichainGetGenesisHashButton');
          await TestSnaps.checkResultSpanIncludes(
            'multichainProviderResultSpan',
            chain.genesisHash,
          );

          // Test getting accounts.
          await TestSnaps.tapButton('sendMultichainAccountsButton');
          await TestSnaps.checkResultSpanIncludes(
            'multichainProviderResultSpan',
            chain.account,
          );

          // Test signing messages.
          await TestSnaps.fillMessage(
            'signMessageMultichainMessageInput',
            'foo',
          );
          await TestSnaps.tapButton('signMessageMultichainButton');
          if (chain.name === 'Solana') {
            await TestSnaps.approveSolanaConfirmation();
          } else {
            await TestSnaps.approveNativeConfirmation();
          }
          await TestSnaps.checkResultSpan(
            'signMessageMultichainResultSpan',
            chain.signMessageSignature,
          );

          if (chain.signTypedDataSignature) {
            // Test signing typed data.
            await TestSnaps.fillMessage(
              'signTypedDataMultichainMessageInput',
              'bar',
            );
            await TestSnaps.tapButton('signTypedDataMultichainButton');

            await Assertions.expectElementToBeVisible(
              RequestTypes.TypedSignRequest,
            );
            await TestSnaps.approveNativeConfirmation();

            await TestSnaps.checkResultSpan(
              'signTypedDataMultichainResultSpan',
              chain.signTypedDataSignature,
            );
          }
        }
      },
    );
  });
});
