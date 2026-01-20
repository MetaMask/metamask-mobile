import { RegressionConfirmations } from '../../tags';
import WalletView from '../../pages/wallet/WalletView';
import RedesignedSendView from '../../pages/Send/RedesignedSendView';
import ActivitiesView from '../../pages/Transactions/ActivitiesView';
import TransactionConfirmationView from '../../pages/Send/TransactionConfirmView';
import { loginToApp } from '../../viewHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import Assertions from '../../framework/Assertions';
import { Mockttp } from 'mockttp';
import { oldConfirmationsRemoteFeatureFlags } from '../../api-mocking/mock-responses/feature-flags-mocks';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper';
import { AnvilPort } from '../../framework/fixtures/FixtureUtils';
import { LocalNode } from '../../framework/types';
import { AnvilManager } from '../../seeder/anvil-manager';

const VALID_ADDRESS = '0xebe6CcB6B55e1d094d9c58980Bc10Fed69932cAb';
const testSpecificMock = async (mockServer: Mockttp) => {
  await setupRemoteFeatureFlagsMock(
    mockServer,
    Object.assign({}, ...oldConfirmationsRemoteFeatureFlags),
  );
};

describe(
  RegressionConfirmations('Advanced Gas Fees and Priority Tests'),
  () => {
    it('should edit priority gas settings and send ETH', async () => {
      await withFixtures(
        {
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
          testSpecificMock,
        },
        async () => {
          await loginToApp();

          // Check that we are on the wallet screen
          await Assertions.expectElementToBeVisible(WalletView.container);

          //Tap send Icon
          await WalletView.tapWalletSendButton();

          await RedesignedSendView.inputRecipientAddress(VALID_ADDRESS);
          await RedesignedSendView.typeInTransactionAmount('0.00004');
          await RedesignedSendView.pressReviewButton();

          // Check that we are on the confirm view
          await Assertions.expectElementToBeVisible(
            TransactionConfirmationView.transactionViewContainer,
          );

          // Check different gas options
          await TransactionConfirmationView.tapEstimatedGasLink();
          await Assertions.expectElementToBeVisible(
            TransactionConfirmationView.editPriorityFeeSheetContainer,
          );
          await TransactionConfirmationView.tapLowPriorityGasOption();
          await TransactionConfirmationView.tapAdvancedOptionsPriorityGasOption();
          await TransactionConfirmationView.tapMarketPriorityGasOption();
          await Assertions.expectTextDisplayed('2');
          await TransactionConfirmationView.tapAggressivePriorityGasOption();
          await Assertions.expectTextDisplayed('3');

          await TransactionConfirmationView.tapAdvancedOptionsPriorityGasOption();
          await TransactionConfirmationView.tapMaxPriorityFeeSaveButton();
          await Assertions.expectElementToBeVisible(
            TransactionConfirmationView.transactionViewContainer,
          );
          // Tap on the send button
          await TransactionConfirmationView.tapConfirmButton();

          // Check that we are on the Activities View
          await Assertions.expectElementToBeVisible(ActivitiesView.container);
        },
      );
    });
  },
);
