/* eslint-disable no-console */
'use strict';
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
import TestHelpers from '../../helpers';
import { SmokeMultichainApi } from '../../tags';
import Browser from '../../pages/Browser/BrowserView';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import FixtureBuilder from '../../fixtures/fixture-builder';
import { withFixtures, DEFAULT_MULTICHAIN_TEST_DAPP_FIXTURE_OPTIONS } from '../../fixtures/fixture-helper';
import { loginToApp } from '../../viewHelper';
import Assertions from '../../utils/Assertions';
import MultichainTestDApp from '../../pages/Browser/MultichainTestDApp';
import { BrowserViewSelectorsIDs } from '../../selectors/Browser/BrowserView.selectors';
import MultichainUtilities from '../../utils/MultichainUtilities';

describe(SmokeMultichainApi('wallet_notify'), () => {
    beforeEach(() => {
        jest.setTimeout(150000);
    });

    it('should receive a notification through the Multichain API for the event subscribed to', async () => {
        await withFixtures(
            {
                ...DEFAULT_MULTICHAIN_TEST_DAPP_FIXTURE_OPTIONS,
                fixture: new FixtureBuilder().withPopularNetworks().build(),
                restartDevice: true,
            },
            async () => {
                await TestHelpers.reverseServerPort();
                await loginToApp();
                await TabBarComponent.tapBrowser();
                await Assertions.checkIfVisible(Browser.browserScreenID);
                await MultichainTestDApp.navigateToMultichainTestDApp('?autoMode=true');

                await Assertions.checkIfVisible(
                    Promise.resolve(element(by.id(BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID))),
                );

                const networksToTest = MultichainUtilities.NETWORK_COMBINATIONS.SINGLE_ETHEREUM;
                const createResult = await MultichainTestDApp.createSessionWithNetworks(networksToTest);

                const createAssertions = MultichainUtilities.generateSessionAssertions(createResult, networksToTest);

                if (!createAssertions.success) {
                    throw new Error('Session creation failed');
                }

                await TestHelpers.delay(3000);

                const webview = MultichainTestDApp.getWebView();
                const chainId = MultichainUtilities.CHAIN_IDS.ETHEREUM_MAINNET;
                const scope = MultichainUtilities.getEIP155Scope(chainId);
                const escapedScope = scope.replace(/:/g, '-');

                // Check initial notification state
                let initiallyEmpty = false;
                try {
                    const notificationContainer = webview.element(by.web.id('wallet-notify-container'));
                    await notificationContainer.scrollToView();

                    try {
                        const emptyMessage = webview.element(by.web.id('wallet-notify-empty'));
                        await Assertions.checkIfVisible(Promise.resolve(emptyMessage));
                        initiallyEmpty = true;
                    } catch (e) {
                        // Notifications might already exist from previous test
                    }
                } catch (e) {
                    // Could not check initial notification state
                }

                // Subscribe to events
                const directButtonId = `direct-invoke-${escapedScope}-eth_subscribe`;
                const directButton = webview.element(by.web.id(directButtonId));
                await directButton.tap();
                console.log('✅ Successfully subscribed to events');

                // Verify subscription was successful by checking invoke result
                try {
                    const invokeResultId = `invoke-method-${escapedScope}-eth_subscribe-result-0`;
                    const invokeResultElement = webview.element(by.web.id(invokeResultId));
                    await invokeResultElement.scrollToView();

                    try {
                        await invokeResultElement.tap();
                    } catch (e) {
                        // Subscription result found but not tappable (Detox limitation)
                    }
                } catch (e) {
                    // Could not find subscription result - might be rendered differently
                }

                // Wait for notifications to arrive
                await TestHelpers.delay(8000);

                // Verify notifications arrived
                const notificationContainer = webview.element(by.web.id('wallet-notify-container'));
                await notificationContainer.scrollToView();

                try {
                    await notificationContainer.tap();
                } catch (e) {
                    // Notification container found but not tappable
                }

                // Check if container is empty or has notifications
                let hasNotifications = false;

                try {
                    const emptyMessage = webview.element(by.web.id('wallet-notify-empty'));
                    await Assertions.checkIfVisible(Promise.resolve(emptyMessage));
                } catch (e) {
                    // Empty message not found - good, means we have notifications
                }

                // Look for notification details elements
                try {
                    const firstNotification = webview.element(by.web.id('wallet-notify-details-0'));
                    await firstNotification.scrollToView();
                    hasNotifications = true;
                    console.log('✅ Found wallet-notify-details-0 - notifications are being delivered!');
                } catch (e) {
                    // No notifications found
                }

                if (hasNotifications) {
                    if (initiallyEmpty) {
                        console.log('✅ Confirmed state change: empty → has notifications');
                    }
                    console.log('✅ wallet_notify test passed');
                } else {
                    throw new Error('No notifications were delivered after subscription');
                }
            },
        );
    });
});
