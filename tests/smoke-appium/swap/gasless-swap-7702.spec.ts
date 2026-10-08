import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import { LocalNodeType } from '../../framework/types.js';
import Assertions from '../../framework/Assertions.js';
import WalletView from '../../page-objects/wallet/WalletView.js';
import { SmokeSwap } from '../../tags.js';
import { loginToAppPlaywright } from '../../flows/wallet.flow.js';
import QuoteView from '../../page-objects/swaps/QuoteView.js';
import { GASLESS_SWAP_QUOTES_ETH_MUSD_7702 } from '../../helpers/swap/constants.js';
import { prepareSwapsTestEnvironment } from '../../helpers/swap/prepareSwapsTestEnvironment.js';
import { checkSwapActivity } from '../../helpers/swap/swap-unified-ui.js';
import {
  buildLocalhostFixture,
  mockGaslessMusdQuote,
} from '../../helpers/swap/gasless-swap.helpers.js';

appiumTest.describe(SmokeSwap('Gasless Swap - 7702 ETH to MUSD'), () => {
  appiumTest.describe.configure({ timeout: 240_000 });

  appiumTest(
    'completes a gasless 7702 ETH to MUSD swap (native source)',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withFixtures(
        {
          fixture: buildLocalhostFixture,
          localNodeOptions: [
            {
              type: LocalNodeType.anvil,
              options: { chainId: 1 },
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
          await QuoteView.tapToken('0x1', 'MUSD');

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
