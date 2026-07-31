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

interface MultichainChain {
  name: 'Ethereum' | 'Sepolia' | 'Solana';
  chainId?: string;
  genesisHash: string;
  account: string;
  signMessageSignature: string;
  signTypedDataSignature?: string;
}

const CHAINS: MultichainChain[] = [
  {
    name: 'Ethereum',
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
    name: 'Sepolia',
    chainId: '0xaa36a7',
    genesisHash:
      '0x25a5cc106eea7138acab33231d7160d69cb777ee0c2c553fcddf5138993e6dd9',
    account: 'eip155:11155111:0x5cfe73b6021e818b776b421b1c4db2474086a7e1',
    signMessageSignature:
      '"0xf63c587cd42e7775e2e815a579f9744ea62944f263b3e69fad48535ba98a5ea107bc878088a99942733a59a89ef1d590eafdb467d59cf76564158d7e78351b751b"',
    signTypedDataSignature:
      '"0x35bb09b05a3f7e4a0965fbf35b48d9d51efa5f7d030bdf4c18f4ad958941d20213a3e0ef731c1ee7619248331f5c259829581da38e9112624c1f8639e954572d1c"',
  },
  {
    name: 'Solana',
    genesisHash: '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
    account:
      'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp:4tE76eixEgyJDrdykdWJR1XBkzUk4cLMvqjR2xVJUxer',
    signMessageSignature:
      '"5RH4BJB99CvWqPhXAtUwLQGJePeeXFLQKbztFbiasAe4mEGmr4moV2g2XEEwWMSsZKQGiV1UHxVGuVMenXAcfKfi"',
  },
];

const multiSrpFixture = new FixtureBuilder()
  .withMultiSRPKeyringController()
  .build();

const multichainMocks = async (mockServer: Mockttp) => {
  await setupRemoteFeatureFlagsMock(
    mockServer,
    Object.assign({}, ...confirmationFeatureFlags),
  );
  await mockGenesisBlocks(mockServer);
};

async function exerciseMultichainChain(chain: MultichainChain): Promise<void> {
  await TestSnaps.selectInDropdown('multichainNetworkDropdown', chain.name);

  if (chain.chainId) {
    await TestSnaps.tapButton('sendMultichainChainIdButton');
    await TestSnaps.checkResultSpanIncludes(
      'multichainProviderResultSpan',
      chain.chainId,
    );
  }

  await TestSnaps.tapButton('sendMultichainGetGenesisHashButton');
  await TestSnaps.checkResultSpanIncludes(
    'multichainProviderResultSpan',
    chain.genesisHash,
  );

  await TestSnaps.tapButton('sendMultichainAccountsButton');
  await TestSnaps.checkResultSpanIncludes(
    'multichainProviderResultSpan',
    chain.account,
  );

  await TestSnaps.fillMessage('signMessageMultichainMessageInput', 'foo');
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
    await TestSnaps.fillMessage('signTypedDataMultichainMessageInput', 'bar');
    await TestSnaps.tapButton('signTypedDataMultichainButton');
    await Assertions.expectElementToBeVisible(RequestTypes.TypedSignRequest);
    await TestSnaps.approveNativeConfirmation();
    await TestSnaps.checkResultSpan(
      'signTypedDataMultichainResultSpan',
      chain.signTypedDataSignature,
    );
  }
}

appiumTest.describe(SmokeSnaps('Multichain Provider Snap Tests'), () => {
  appiumTest.describe.configure({ mode: 'serial', timeout: 150_000 });

  appiumTest(
    'can use the Multichain provider on Ethereum',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withSnapsFixtures(
        currentDeviceDetails,
        {
          fixture: multiSrpFixture,
          testSpecificMock: multichainMocks,
          restartDevice: true,
        },
        async () => {
          await loginAndOpenTestSnaps();
          await TestSnaps.installSnap('connectMultichainProviderButton');

          await TestSnaps.tapButton('sendCreateSessionButton');
          await Assertions.expectElementToBeVisible(
            ConnectBottomSheet.connectButton,
          );
          await ConnectBottomSheet.tapConnectButton();

          await exerciseMultichainChain(CHAINS[0]);
        },
      );
    },
  );

  appiumTest(
    'can use the Multichain provider on Sepolia',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withSnapsFixtures(
        currentDeviceDetails,
        {
          fixture: multiSrpFixture,
          testSpecificMock: multichainMocks,
          restartDevice: false,
        },
        async () => {
          await exerciseMultichainChain(CHAINS[1]);
        },
      );
    },
  );

  appiumTest(
    'can use the Multichain provider on Solana',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withSnapsFixtures(
        currentDeviceDetails,
        {
          fixture: multiSrpFixture,
          testSpecificMock: multichainMocks,
          restartDevice: false,
        },
        async () => {
          await exerciseMultichainChain(CHAINS[2]);
        },
      );
    },
  );
});
