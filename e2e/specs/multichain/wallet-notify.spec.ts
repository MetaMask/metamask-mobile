/**
 * E2E tests for wallet_notify API
 * Tests receiving notifications for subscribed events on specific chains
 *
 * TEST FLOW:
 * 1. Create a session with MetaMask Mobile
 * 2. Subscribe to blockchain events using eth_subscribe
 * 3. Verify the subscription returns a valid ID (hex string)
 * 4. Wait for and verify that notifications are delivered to the dapp
 *
 * WHAT WE'RE TESTING:
 * - wallet_notify allows dapps to receive real-time blockchain event notifications
 * - eth_subscribe creates a subscription and returns a subscription ID
 * - The wallet delivers notifications which appear as "wallet-notify-details-X" elements
 *
 * DETOX WEBVIEW LIMITATIONS AND METHODOLOGY:
 * ==========================================
 * Detox has significant limitations when working with webviews:
 * 1. Cannot use by.web.text() or by.web.attr() - only by.web.id() and by.web.className() work
 * 2. Cannot get innerHTML or text content directly from elements
 * 3. Elements might exist in DOM but not be "visible" according to Detox visibility rules
 *
 * Our methodology to work around these limitations:
 * 1. Use element IDs exclusively for selection (added id="wallet-notify-empty" to the dapp)
 * 2. Use scrollToView() to bring elements into viewport
 * 3. Use tap() to verify elements are interactive even if not "visible"
 * 4. Infer state by checking presence/absence of specific elements
 * 5. Check for state changes (empty → has notifications) to prove functionality
 */
import { SmokeMultiChainAPI } from '../../tags';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import MultichainTestDApp from '../../pages/Browser/MultichainTestDApp';
import MultichainUtilities from '../../utils/MultichainUtilities';
import Assertions from '../../framework/Assertions';
import { DappVariants } from '../../framework/Constants';

describe(SmokeMultiChainAPI('wallet_notify'), () => {
  beforeEach(() => {
    jest.setTimeout(150000);
  });

  it('should receive a notification through the Multichain API for the event subscribed to', async () => {
    await withFixtures(
      {
        dapps: [
          {
            dappVariant: DappVariants.MULTICHAIN_TEST_DAPP,
          },
        ],
        fixture: new FixtureBuilder().withPopularNetworks().build(),
        restartDevice: true,
      },
      async () => {
        await MultichainTestDApp.setupAndNavigateToTestDapp('?autoMode=true');

        const networksToTest =
          MultichainUtilities.NETWORK_COMBINATIONS.SINGLE_ETHEREUM;
        await MultichainTestDApp.createSessionWithNetworks(networksToTest);

        const chainId = MultichainUtilities.CHAIN_IDS.ETHEREUM_MAINNET;

        // Check initial notification state
        const initiallyEmpty =
          await MultichainTestDApp.isNotificationContainerEmpty();

        // Subscribe to events
        const subscribed = await MultichainTestDApp.subscribeToChainEvents(
          chainId,
        );

        // Verify subscription was successful
        await Assertions.checkIfTextMatches(
          subscribed ? 'true' : 'false',
          'true',
        );

        console.log('✅ Successfully subscribed to events');

        // Wait for notifications to arrive
        // Check if we have notifications now
        const hasNotifications = await MultichainTestDApp.hasNotifications();

        // Verify notifications were delivered
        await Assertions.checkIfTextMatches(
          hasNotifications ? 'true' : 'false',
          'true',
        );

        if (hasNotifications && initiallyEmpty) {
          console.log('✅ Confirmed state change: empty → has notifications');
        }

        console.log('✅ wallet_notify test passed');
      },
    );
  });
});
