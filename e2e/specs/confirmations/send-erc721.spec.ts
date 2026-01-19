import { RegressionConfirmations } from '../../tags';
import { loginToApp, navigateToBrowserView } from '../../viewHelper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import TestDApp from '../../pages/Browser/TestDApp';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { SMART_CONTRACTS } from '../../../app/util/test/smart-contracts';
import { ActivitiesViewSelectorsText } from '../../../app/components/Views/ActivityView/ActivitiesView.testIds';
import Assertions from '../../framework/Assertions';
import {
  AnvilPort,
  buildPermissions,
} from '../../framework/fixtures/FixtureUtils';
import { DappVariants } from '../../framework/Constants';
import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper';
import { oldConfirmationsRemoteFeatureFlags } from '../../api-mocking/mock-responses/feature-flags-mocks';
import NetworkListModal from '../../pages/Network/NetworkListModal';
import WalletView from '../../pages/wallet/WalletView';
import { LocalNode } from '../../framework/types';
import { AnvilManager } from '../../seeder/anvil-manager';

describe(RegressionConfirmations('ERC721 tokens'), () => {
  const NFT_CONTRACT = SMART_CONTRACTS.NFTS;

  it('send an ERC721 token from a dapp', async () => {
    const testSpecificMock = async (mockServer: Mockttp) => {
      await setupRemoteFeatureFlagsMock(
        mockServer,
        Object.assign({}, ...oldConfirmationsRemoteFeatureFlags),
      );
    };

    await withFixtures(
      {
        dapps: [
          {
            dappVariant: DappVariants.TEST_DAPP,
          },
        ],
        fixture: ({ localNodes }: { localNodes?: LocalNode[] }) => {
          const node = localNodes?.[0] as unknown as AnvilManager;
          const rpcPort =
            node instanceof AnvilManager
              ? (node.getPort() ?? AnvilPort())
              : undefined;

          return new FixtureBuilder()
            .withNetworkController({
              providerConfig: {
                chainId: '0x539',
                rpcUrl: `http://localhost:${rpcPort ?? AnvilPort()}`,
                type: 'custom',
                nickname: 'Local RPC',
                ticker: 'ETH',
              },
            })
            .withPermissionControllerConnectedToTestDapp(
              buildPermissions(['0x539']),
            )
            .build();
        },
        restartDevice: true,
        smartContracts: [NFT_CONTRACT],
        testSpecificMock,
      },
      async ({ contractRegistry }) => {
        const nftsAddress =
          await contractRegistry?.getContractAddress(NFT_CONTRACT);
        await loginToApp();

        // Navigate to the browser screen
        await navigateToBrowserView();
        await TestDApp.navigateToTestDappWithContract({
          contractAddress: nftsAddress,
        });
        // Transfer NFT

        await TestDApp.tapNFTTransferButton();

        await TestDApp.tapConfirmButton();

        // Navigate to the activity screen
        await TabBarComponent.tapActivity();

        await WalletView.tapTokenNetworkFilter();
        await NetworkListModal.tapOnCustomTab();
        await NetworkListModal.changeNetworkTo('Localhost');

        // Assert collectible is sent
        await Assertions.expectTextDisplayed(
          ActivitiesViewSelectorsText.SENT_COLLECTIBLE_MESSAGE_TEXT,
        );
      },
    );
  });
});
