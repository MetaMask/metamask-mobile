/* eslint-disable no-console */
'use strict';
/**
 * E2E tests for wallet_sessionChanged API
 * Tests that sessionChanged event is fired when networks are added to the session
 */
import TestHelpers from '../../helpers';
import { SmokeNetworkExpansion } from '../../tags';
import FixtureBuilder from '../../fixtures/fixture-builder';
import { DEFAULT_MULTICHAIN_TEST_DAPP_FIXTURE_OPTIONS, withFixtures } from '../../fixtures/fixture-helper';
import MultichainTestDApp from '../../pages/Browser/MultichainTestDApp';
import MultichainUtilities from '../../utils/MultichainUtilities';

describe(SmokeNetworkExpansion('wallet_sessionChanged'), () => {
    beforeEach(() => {
        jest.setTimeout(150000);
    });

    it('should receive a wallet_sessionChanged event when creating a new session with different networks', async () => {
        await withFixtures(
            {
                ...DEFAULT_MULTICHAIN_TEST_DAPP_FIXTURE_OPTIONS,
                fixture: new FixtureBuilder().withPopularNetworks().build(),
                restartDevice: true,
            },
            async () => {
                await MultichainTestDApp.setupAndNavigateToTestDapp('?autoMode=true');

                // Create initial session with Ethereum and Polygon
                const initialNetworks = [
                    MultichainUtilities.CHAIN_IDS.ETHEREUM_MAINNET,
                    MultichainUtilities.CHAIN_IDS.POLYGON
                ];
                await MultichainTestDApp.createSessionWithNetworks(initialNetworks);

                await TestHelpers.delay(3000);

                const webview = MultichainTestDApp.getWebView();

                // Add Base network to the session
                const modifiedNetworks = [
                    MultichainUtilities.CHAIN_IDS.ETHEREUM_MAINNET,
                    MultichainUtilities.CHAIN_IDS.BASE,
                ];

                await MultichainTestDApp.createSessionWithNetworks(modifiedNetworks);

                await TestHelpers.delay(5000);

                // Check the most recent sessionChanged event at index 0
                const baseScope = MultichainUtilities.getEIP155Scope(MultichainUtilities.CHAIN_IDS.BASE);

                const eventResult = webview.element(by.web.id('wallet-session-changed-result-0'));
                await eventResult.scrollToView();
                const eventText = await eventResult.runScript((el) => el.textContent || '');

                if (!eventText) {
                    throw new Error('Could not read sessionChanged event content');
                }

                const parsedEvent = JSON.parse(eventText);
                const eventScopes = Object.keys(parsedEvent.params?.sessionScopes || {});

                if (!eventScopes.includes(baseScope)) {
                    throw new Error(`Base network (${baseScope}) not found in sessionChanged event. Found: ${eventScopes.join(', ')}`);
                }

                console.log('✅ wallet_sessionChanged test passed - event triggered correctly');
            },
        );
    });
});
