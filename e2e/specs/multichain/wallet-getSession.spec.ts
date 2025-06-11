/* eslint-disable no-console */
'use strict';
/**
 * E2E tests for wallet_getSession API
 * Tests getting session information in different scenarios
 */
import TestHelpers from '../../helpers';
import { SmokeNetworkExpansion } from '../../tags';
import Browser from '../../pages/Browser/BrowserView';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import FixtureBuilder from '../../fixtures/fixture-builder';
import { withFixtures, DEFAULT_MULTICHAIN_TEST_DAPP_FIXTURE_OPTIONS } from '../../fixtures/fixture-helper';
import { loginToApp } from '../../viewHelper';
import Assertions from '../../utils/Assertions';
import MultichainTestDApp from '../../pages/Browser/MultichainTestDApp';
import { BrowserViewSelectorsIDs } from '../../selectors/Browser/BrowserView.selectors';
import MultichainUtilities from '../../utils/MultichainUtilities';

describe(SmokeNetworkExpansion('wallet_getSession'), () => {
    beforeEach(() => {
        jest.setTimeout(150000);
    });

    it('should successfully receive empty session scopes when there is no existing session', async () => {
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
                await MultichainTestDApp.navigateToMultichainTestDApp();

                await Assertions.checkIfVisible(
                    Promise.resolve(element(by.id(BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID))),
                );

                await MultichainTestDApp.scrollToPageTop();
                const connected = await MultichainTestDApp.useAutoConnectButton();
                if (!connected) {
                    throw new Error('Failed to connect to dapp');
                }

                const sessionResult = await MultichainTestDApp.getSessionData();
                const assertions = MultichainUtilities.generateSessionAssertions(sessionResult, []);

                if (!assertions.structureValid) {
                    throw new Error('Invalid session structure');
                }

                if (!assertions.success) {
                    // Session retrieval returned empty scopes as expected
                } else if (assertions.chainCount === 0) {
                    // Session retrieval returned empty session scopes as expected
                } else {
                    throw new Error(`Expected empty session scopes, but found ${assertions.chainCount} chains`);
                }

                if (sessionResult.sessionScopes && Object.keys(sessionResult.sessionScopes).length > 0) {
                    throw new Error('Expected empty session scopes object');
                }

            },
        );
    });

    it('should successfully receive result that specifies its permitted session scopes for selected chains', async () => {
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
                await MultichainTestDApp.navigateToMultichainTestDApp();
                const networksToTest = MultichainUtilities.NETWORK_COMBINATIONS.SINGLE_ETHEREUM;
                const createResult = await MultichainTestDApp.createSessionWithNetworks(networksToTest);

                const createAssertions = MultichainUtilities.generateSessionAssertions(createResult, networksToTest);

                if (!createAssertions.success) {
                    throw new Error('Initial session creation failed');
                }

                await TestHelpers.delay(1000);

                const getSessionResult = await MultichainTestDApp.getSessionData();
                const getAssertions = MultichainUtilities.generateSessionAssertions(getSessionResult, networksToTest);

                if (!getAssertions.structureValid) {
                    throw new Error('Invalid session structure');
                }

                if (!getAssertions.success) {
                    throw new Error('Failed to retrieve session data');
                }

                if (!getAssertions.chainsValid) {
                    MultichainUtilities.logSessionDetails(getSessionResult, 'Failed Session Validation');
                    throw new Error(`Chain validation failed. Missing chains: ${getAssertions.missingChains.join(', ')}`);
                }

                if (getAssertions.chainCount !== networksToTest.length) {
                    throw new Error(`Expected ${networksToTest.length} chains, but found ${getAssertions.chainCount}`);
                }

                const expectedScope = MultichainUtilities.getEIP155Scope(MultichainUtilities.CHAIN_IDS.ETHEREUM_MAINNET);
                if (!getSessionResult.sessionScopes?.[expectedScope]) {
                    throw new Error(`Expected session scope ${expectedScope} not found`);
                }

                const ethereumScope = getSessionResult.sessionScopes[expectedScope];
                if (!ethereumScope.accounts || ethereumScope.accounts.length === 0) {
                    throw new Error('Expected session scope to have accounts');
                }

            },
        );
    });

    it('should return consistent session data across multiple getSession calls', async () => {
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
                await MultichainTestDApp.navigateToMultichainTestDApp();
                const networksToTest = MultichainUtilities.NETWORK_COMBINATIONS.SINGLE_ETHEREUM;
                const createResult = await MultichainTestDApp.createSessionWithNetworks(networksToTest);

                const createAssertions = MultichainUtilities.generateSessionAssertions(createResult, networksToTest);

                if (!createAssertions.success) {
                    throw new Error('Session creation failed');
                }

                await TestHelpers.delay(1000);

                const getSessionResult1 = await MultichainTestDApp.getSessionData();
                await TestHelpers.delay(500);
                const getSessionResult2 = await MultichainTestDApp.getSessionData();
                await TestHelpers.delay(500);
                const getSessionResult3 = await MultichainTestDApp.getSessionData();

                const assertions1 = MultichainUtilities.generateSessionAssertions(getSessionResult1, networksToTest);
                const assertions2 = MultichainUtilities.generateSessionAssertions(getSessionResult2, networksToTest);
                const assertions3 = MultichainUtilities.generateSessionAssertions(getSessionResult3, networksToTest);

                if (!assertions1.success || !assertions2.success || !assertions3.success) {
                    throw new Error('One or more getSession calls failed');
                }

                const scopes1 = JSON.stringify(getSessionResult1.sessionScopes);
                const scopes2 = JSON.stringify(getSessionResult2.sessionScopes);
                const scopes3 = JSON.stringify(getSessionResult3.sessionScopes);

                if (scopes1 !== scopes2 || scopes2 !== scopes3) {
                    throw new Error('Session data inconsistent across multiple calls');
                }

                const actualChains = assertions1.foundChains;
                console.log(`Session consistency test passed with ${actualChains.length} chains: ${actualChains.join(', ')}`);
                if (actualChains.length === 0) {
                    throw new Error('No chains found in session');
                }

                if (assertions1.chainCount !== assertions2.chainCount || assertions2.chainCount !== assertions3.chainCount) {
                    throw new Error(`Chain count inconsistent: ${assertions1.chainCount}, ${assertions2.chainCount}, ${assertions3.chainCount}`);
                }


            },
        );
    });

    it('should handle getSession after session has been modified', async () => {
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
                await MultichainTestDApp.navigateToMultichainTestDApp();

                const initialNetworks = MultichainUtilities.NETWORK_COMBINATIONS.SINGLE_ETHEREUM;
                const createResult1 = await MultichainTestDApp.createSessionWithNetworks(initialNetworks);

                const createAssertions1 = MultichainUtilities.generateSessionAssertions(createResult1, initialNetworks);

                if (!createAssertions1.success) {
                    throw new Error('Initial session creation failed');
                }

                await TestHelpers.delay(1000);
                const getSessionResult1 = await MultichainTestDApp.getSessionData();
                const getAssertions1 = MultichainUtilities.generateSessionAssertions(getSessionResult1, initialNetworks);

                if (!getAssertions1.success || getAssertions1.chainCount === 0) {
                    throw new Error('Initial session validation failed');
                }

                const initialChainCount = getAssertions1.chainCount;
                console.log(`Initial session has ${initialChainCount} chain(s)`);

                const newNetworks = [
                    MultichainUtilities.CHAIN_IDS.ETHEREUM_MAINNET,
                    MultichainUtilities.CHAIN_IDS.LINEA_MAINNET,
                    MultichainUtilities.CHAIN_IDS.ARBITRUM_ONE
                ];

                const createResult2 = await MultichainTestDApp.createSessionWithNetworks(newNetworks);
                const createAssertions2 = MultichainUtilities.generateSessionAssertions(createResult2, newNetworks);

                if (!createAssertions2.success) {
                    throw new Error('New session creation failed');
                }

                await TestHelpers.delay(1000);
                const getSessionResult2 = await MultichainTestDApp.getSessionData();
                const getAssertions2 = MultichainUtilities.generateSessionAssertions(getSessionResult2, []);

                if (!getAssertions2.success) {
                    throw new Error('Failed to retrieve modified session data');
                }

                const finalChainCount = getAssertions2.chainCount;
                const finalChains = getAssertions2.foundChains;
                console.log(`Modified session has ${finalChainCount} chain(s): ${finalChains.join(', ')}`);

                if (finalChainCount === 0) {
                    throw new Error('Modified session should not be empty');
                }

                if (!finalChains.includes(MultichainUtilities.CHAIN_IDS.ETHEREUM_MAINNET)) {
                    MultichainUtilities.logSessionDetails(getSessionResult2, 'Missing Ethereum');
                    throw new Error('Ethereum mainnet should be present in modified session');
                }


            },
        );
    });
});
