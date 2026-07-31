import { test as appiumTest } from '../../../framework/fixtures/playwright/index.js';
import FixtureBuilder, {
  DEFAULT_FIXTURE_ACCOUNT,
} from '../../../framework/fixtures/FixtureBuilder.js';
import FooterActions from '../../../page-objects/Browser/Confirmations/FooterActions.js';
import SendView from '../../../page-objects/Send/RedesignedSendView.js';
import TabBarComponent from '../../../page-objects/wallet/TabBarComponent.js';
import WalletView from '../../../page-objects/wallet/WalletView.js';
import { Assertions } from '../../../framework/index.js';
import {
  DappVariants,
  LOCAL_NODE_RPC_URL,
} from '../../../framework/Constants.js';
import { SmokeConfirmations } from '../../../tags.js';
import { loginToAppPlaywright } from '../../../flows/wallet.flow.js';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper.js';
import { LocalNode, LocalNodeType } from '../../../framework/types.js';
import { setupRemoteFeatureFlagsMock } from '../../../api-mocking/helpers/remoteFeatureFlagsHelper.js';
import { Mockttp } from 'mockttp';
import { setupMockRequest } from '../../../api-mocking/helpers/mockHelpers.js';
import type { AssetsControllerState } from '@metamask/assets-controller';
import { validateTransactionHashInTransactionFinalizedEvent } from './metricsValidationHelper.js';

const RECIPIENT = '0x0c54fccd2e384b4bb6f2e405bf5cbc15a017aafb';
const LOCAL_NATIVE_ASSET_ID = 'eip155:1337/slip44:60';

function buildNativeSendFixture() {
  const fixture = new FixtureBuilder()
    .withNetworkController({
      chainId: '0x539',
      rpcUrl: LOCAL_NODE_RPC_URL,
      type: 'custom',
      nickname: 'Local RPC',
      ticker: 'ETH',
    })
    .withMetaMetricsOptIn()
    .withPreferencesController({})
    .build();

  const backgroundState = fixture.state.engine.backgroundState;
  const selectedAccountId =
    backgroundState.AccountsController.internalAccounts.selectedAccount;
  const existingAssetsController = (backgroundState.AssetsController ??
    {}) as Partial<AssetsControllerState>;
  const now = Date.now();

  backgroundState.AssetsController = {
    ...existingAssetsController,
    selectedCurrency: 'usd',
    assetsInfo: {
      ...existingAssetsController.assetsInfo,
      [LOCAL_NATIVE_ASSET_ID]: {
        type: 'native',
        symbol: 'ETH',
        name: 'Ethereum',
        decimals: 18,
      },
    },
    assetsBalance: {
      ...existingAssetsController.assetsBalance,
      [selectedAccountId]: {
        ...existingAssetsController.assetsBalance?.[selectedAccountId],
        [LOCAL_NATIVE_ASSET_ID]: {
          amount: '100',
        },
      },
    },
    assetsPrice: {
      ...existingAssetsController.assetsPrice,
      [LOCAL_NATIVE_ASSET_ID]: {
        assetPriceType: 'fungible' as const,
        price: 1,
        usdPrice: 1,
        lastUpdated: now,
      },
    },
    customAssets: {
      ...existingAssetsController.customAssets,
      [selectedAccountId]: [
        ...new Set([
          ...(existingAssetsController.customAssets?.[selectedAccountId] ?? []),
          LOCAL_NATIVE_ASSET_ID,
        ]),
      ],
    },
  };

  return fixture;
}

appiumTest.describe(SmokeConfirmations('Send native asset'), () => {
  appiumTest.describe.configure({ timeout: 2500000 });

  appiumTest(
    'sends MAX balance ETH to an address',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withFixtures(
        {
          dapps: [
            {
              dappVariant: DappVariants.TEST_DAPP,
            },
          ],
          fixture: buildNativeSendFixture,
          localNodeOptions: [
            {
              type: LocalNodeType.anvil,
              options: {
                chainId: 1337,
                balance: 100,
              },
            },
          ],
          restartDevice: true,
          testSpecificMock: async (mockServer: Mockttp) => {
            await setupRemoteFeatureFlagsMock(mockServer);

            await setupMockRequest(mockServer, {
              requestMethod: 'PUT',
              url: /https:\/\/authentication\.api\.cx\.metamask\.io\/api\/v2\/profile\/accounts/i,
              response: {
                message: 'OK',
              },
              responseCode: 200,
            });

            await setupMockRequest(mockServer, {
              url: /accounts\.api\.cx\.metamask\.io\/v4\/multiaccount\/balances/,
              response: {
                balances: [
                  {
                    object: 'token',
                    address: '0x0000000000000000000000000000000000000000',
                    symbol: 'ETH',
                    name: 'Ether',
                    type: 'native',
                    decimals: 18,
                    chainId: 1337,
                    balance: '100.000000000000000000',
                    accountAddress: `eip155:1337:${DEFAULT_FIXTURE_ACCOUNT}`,
                  },
                ],
                unprocessedNetworks: [],
              },
              requestMethod: 'GET',
              responseCode: 200,
            });
          },
          currentDeviceDetails,
        },
        async ({
          localNodes,
          mockServer,
        }: {
          localNodes?: LocalNode[];
          mockServer?: Mockttp;
        }) => {
          await loginToAppPlaywright({ scenarioType: 'e2e' });

          await WalletView.tapWalletSendButton();
          await SendView.selectEthereumToken();
          await SendView.pressAmountMaxButton();
          await SendView.pressContinueButton();
          await SendView.inputRecipientAddress(RECIPIENT);
          await SendView.pressReviewButton();
          await FooterActions.tapConfirmButton();
          await TabBarComponent.tapActivity();
          await Assertions.expectTextDisplayed('Confirmed');

          await validateTransactionHashInTransactionFinalizedEvent(
            localNodes,
            mockServer,
          );
        },
      );
    },
  );
});
