import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import { LocalNode, LocalNodeType } from '../../framework/types.js';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.js';
import Assertions from '../../framework/Assertions.js';
import WalletView from '../../page-objects/wallet/WalletView.js';
import { SmokeSwap } from '../../tags.js';
import { loginToAppPlaywright } from '../../flows/wallet.flow.js';
import { AnvilPort } from '../../framework/fixtures/FixtureUtils.js';
import {
  AnvilManager,
  DEFAULT_ANVIL_PORT,
} from '../../seeder/anvil-manager.js';
import QuoteView from '../../page-objects/swaps/QuoteView.js';
import { setupSSEMockRequest } from '../../api-mocking/helpers/mockHelpers.js';
import {
  GASLESS_SWAP_QUOTES_ETH_MUSD,
  GASLESS_SWAP_QUOTES_ETH_MUSD_7702,
  GASLESS_SWAP_QUOTES_USDC_MUSD,
  toSSEResponse,
} from '../../helpers/swap/constants.js';
import { testSpecificMock as swapTestSpecificMock } from '../../helpers/swap/swap-mocks.js';
import { setupSmartTransactionsMocks } from '../../helpers/swap/smart-transactions-mocks.js';
import { prepareSwapsTestEnvironment } from '../../helpers/swap/prepareSwapsTestEnvironment.js';
import { checkSwapActivity } from '../../helpers/swap/swap-unified-ui.js';

const CHAIN_ID = '0x1';

function buildLocalhostFixture({ localNodes }: { localNodes?: LocalNode[] }) {
  const node = localNodes?.[0] as unknown as AnvilManager;
  const rpcPort =
    node instanceof AnvilManager ? (node.getPort() ?? AnvilPort()) : undefined;

  return new FixtureBuilder()
    .withNetworkController({
      chainId: CHAIN_ID,
      rpcUrl: `http://localhost:${rpcPort ?? AnvilPort()}`,
      type: 'custom',
      nickname: 'Localhost',
      ticker: 'ETH',
    })
    .build();
}

async function mockGaslessMusdQuote(
  mockServer: Parameters<typeof swapTestSpecificMock>[0],
  quote: object[],
): Promise<void> {
  await swapTestSpecificMock(mockServer);
  // Priority 1000 > 999 so this rule beats the empty-string MUSD mock in swapTestSpecificMock.
  await setupSSEMockRequest(
    mockServer,
    /getQuoteStream.*destTokenAddress=0xacA92E438df0B2401fF60dA7E4337B687a2435DA/i,
    toSSEResponse(quote),
    1000,
  );
  await setupSmartTransactionsMocks(mockServer, DEFAULT_ANVIL_PORT);
}

appiumTest.describe(SmokeSwap('Gasless Swap - '), () => {
  appiumTest.describe.configure({ timeout: 180000 });

  appiumTest(
    'completes a gasless ETH to MUSD swap',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withFixtures(
        {
          fixture: buildLocalhostFixture,
          localNodeOptions: [
            {
              type: LocalNodeType.anvil,
              options: {
                chainId: 1,
              },
            },
          ],
          testSpecificMock: async (mockServer) => {
            await mockGaslessMusdQuote(
              mockServer,
              GASLESS_SWAP_QUOTES_ETH_MUSD,
            );
          },
          restartDevice: true,
          skipReactNativeReload: true,
          currentDeviceDetails,
        },
        async () => {
          await loginToAppPlaywright({ scenarioType: 'e2e' });
          await prepareSwapsTestEnvironment();
          await WalletView.tapWalletSwapButton();

          await Assertions.expectElementToBeVisible(QuoteView.sourceTokenArea, {
            description: 'Swap quote view (source token area) visible',
            timeout: 20000,
          });

          await QuoteView.tapSourceAmountInput();
          await QuoteView.enterAmount('1');
          await QuoteView.tapDestinationToken();
          await QuoteView.tapToken(CHAIN_ID, 'MUSD');

          // Verify network fee shows "Included" for gasless swap
          await Assertions.expectElementToBeVisible(QuoteView.networkFeeLabel, {
            timeout: 60000,
            description: 'Network fee label visible',
          });
          await QuoteView.dismissKeypad();
          await Assertions.expectElementToBeVisible(QuoteView.includedLabel, {
            timeout: 10000,
            description: 'Gas fee included in quote',
          });

          await Assertions.expectElementToBeVisible(QuoteView.confirmSwap, {
            description: 'Confirm swap button visible',
          });
          await QuoteView.tapConfirmSwap();

          await checkSwapActivity('ETH', 'MUSD');
        },
      );
    },
  );

  appiumTest(
    'completes a gasless USDC to MUSD swap (ERC-20 source with approval)',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withFixtures(
        {
          fixture: buildLocalhostFixture,
          localNodeOptions: [
            {
              type: LocalNodeType.anvil,
              options: {
                chainId: 1,
                loadState: './tests/smoke-appium/swap/withTokens.json',
              },
            },
          ],
          testSpecificMock: async (mockServer) => {
            await mockGaslessMusdQuote(
              mockServer,
              GASLESS_SWAP_QUOTES_USDC_MUSD,
            );
          },
          restartDevice: true,
          skipReactNativeReload: true,
          currentDeviceDetails,
        },
        async () => {
          await loginToAppPlaywright({ scenarioType: 'e2e' });
          await prepareSwapsTestEnvironment();
          await WalletView.tapWalletSwapButton();

          await Assertions.expectElementToBeVisible(QuoteView.sourceTokenArea, {
            description: 'Swap quote view (source token area) visible',
            timeout: 20000,
          });

          await QuoteView.tapSourceToken();
          await QuoteView.tapToken(CHAIN_ID, 'USDC');
          await QuoteView.tapMax();
          await QuoteView.tapDestinationToken();
          await QuoteView.tapToken(CHAIN_ID, 'MUSD');

          await Assertions.expectElementToBeVisible(QuoteView.networkFeeLabel, {
            timeout: 60000,
            description: 'Network fee label visible',
          });
          await QuoteView.dismissKeypad();
          await Assertions.expectElementToBeVisible(QuoteView.includedLabel, {
            timeout: 10000,
            description: 'Gas fee included in quote',
          });

          await Assertions.expectElementToBeVisible(QuoteView.confirmSwap, {
            description: 'Confirm swap button visible',
          });
          await QuoteView.tapConfirmSwap();

          await checkSwapActivity('USDC', 'MUSD');
        },
      );
    },
  );

  appiumTest(
    'completes a gasless 7702 ETH to MUSD swap (native source)',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withFixtures(
        {
          fixture: buildLocalhostFixture,
          localNodeOptions: [
            {
              type: LocalNodeType.anvil,
              options: {
                chainId: 1,
              },
            },
          ],
          testSpecificMock: async (mockServer) => {
            await mockGaslessMusdQuote(
              mockServer,
              GASLESS_SWAP_QUOTES_ETH_MUSD_7702,
            );
          },
          restartDevice: true,
          skipReactNativeReload: true,
          currentDeviceDetails,
        },
        async () => {
          await loginToAppPlaywright({ scenarioType: 'e2e' });
          await prepareSwapsTestEnvironment();
          await WalletView.tapWalletSwapButton();

          await Assertions.expectElementToBeVisible(QuoteView.sourceTokenArea, {
            description: 'Swap quote view (source token area) visible',
            timeout: 20000,
          });

          await QuoteView.tapSourceAmountInput();
          await QuoteView.enterAmount('1');
          await QuoteView.tapDestinationToken();
          await QuoteView.tapToken(CHAIN_ID, 'MUSD');

          // QuoteDetailsCard (Network fee / Included) only renders after the SSE
          // quote arrives. dismissKeypad taps the Rate label so the keypad does
          // not occlude Confirm — avoid tapping scroll/rate-value (opens providers).
          await Assertions.expectElementToBeVisible(QuoteView.networkFeeLabel, {
            timeout: 60000,
            description: 'Network fee label visible',
          });
          await QuoteView.dismissKeypad();
          await Assertions.expectElementToBeVisible(QuoteView.includedLabel, {
            timeout: 10000,
            description: 'Gas fee included in quote (7702)',
          });

          await Assertions.expectElementToBeVisible(QuoteView.confirmSwap, {
            description: 'Confirm swap button visible',
          });
          await QuoteView.tapConfirmSwap();

          await checkSwapActivity('ETH', 'MUSD');
        },
      );
    },
  );
});
