import { RegressionConfirmations } from '../../tags';
import RedesignedSendView from '../../pages/Send/RedesignedSendView';
import TransactionConfirmationView from '../../pages/Send/TransactionConfirmView';
import { loginToApp } from '../../viewHelper';
import WalletView from '../../pages/wallet/WalletView';
import FixtureBuilder from '../../../tests/framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../../tests/framework/fixtures/FixtureHelper';
import { SMART_CONTRACTS } from '../../../app/util/test/smart-contracts';
import { ActivitiesViewSelectorsText } from '../../../app/components/Views/ActivityView/ActivitiesView.testIds';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import Assertions from '../../../tests/framework/Assertions';
import { DappVariants } from '../../../tests/framework/Constants';
import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../../tests/api-mocking/helpers/remoteFeatureFlagsHelper';
import { oldConfirmationsRemoteFeatureFlags } from '../../../tests/api-mocking/mock-responses/feature-flags-mocks';
import { LocalNode } from '../../../tests/framework/types';
import { AnvilPort } from '../../../tests/framework/fixtures/FixtureUtils';
import { AnvilManager } from '../../seeder/anvil-manager';

const HST_CONTRACT = SMART_CONTRACTS.HST;

describe.skip(RegressionConfirmations('Send to contract address'), () => {
  it('should send ETH to a contract from inside the wallet', async () => {
    const AMOUNT = '12';

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
            .build();
        },
        restartDevice: true,
        smartContracts: [HST_CONTRACT],
        testSpecificMock,
      },
      async ({ contractRegistry }) => {
        const hstAddress =
          await contractRegistry?.getContractAddress(HST_CONTRACT);
        await loginToApp();

        await WalletView.tapWalletSendButton();

        await RedesignedSendView.inputRecipientAddress(hstAddress);
        await RedesignedSendView.typeInTransactionAmount(AMOUNT);
        await RedesignedSendView.pressReviewButton();

        await TransactionConfirmationView.tapConfirmButton();
        await TabBarComponent.tapActivity();

        await Assertions.expectTextDisplayed(
          ActivitiesViewSelectorsText.SMART_CONTRACT_INTERACTION,
        );
      },
    );
  });
});
