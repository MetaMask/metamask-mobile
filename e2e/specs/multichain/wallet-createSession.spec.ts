/* eslint-disable no-console */
'use strict';
/**
 * E2E tests for wallet_createSession API
 * Tests creating sessions with different scope combinations and verifying permissions
 */
import { SmokeMultichainApi } from '../../tags';
import TestHelpers from '../../helpers';
import Browser from '../../pages/Browser/BrowserView';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import FixtureBuilder from '../../fixtures/fixture-builder';
import { withFixtures, DEFAULT_MULTICHAIN_TEST_DAPP_FIXTURE_OPTIONS } from '../../fixtures/fixture-helper';
import { loginToApp } from '../../viewHelper';
import Assertions from '../../utils/Assertions';
import MultichainTestDApp from '../../pages/Browser/MultichainTestDApp';
import { BrowserViewSelectorsIDs } from '../../selectors/Browser/BrowserView.selectors';
import MultichainUtilities from '../../utils/MultichainUtilities';

describe(SmokeMultichainApi('wallet_createSession'), () => {
    beforeEach(() => {
        jest.setTimeout(150000);
    });

    it('should create a session with Ethereum mainnet scope', async () => {
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

                const sessionResult = await MultichainTestDApp.createSessionWithNetworks(
                    MultichainUtilities.NETWORK_COMBINATIONS.SINGLE_ETHEREUM
                );

                const assertions = MultichainUtilities.generateSessionAssertions(
                    sessionResult,
                    MultichainUtilities.NETWORK_COMBINATIONS.SINGLE_ETHEREUM
                );

                MultichainUtilities.logSessionDetails(sessionResult, 'Single Ethereum Test');

                if (!assertions.structureValid) {
                    throw new Error('Invalid session structure');
                }

                if (!assertions.success) {
                    throw new Error('Session creation failed');
                }

                if (!assertions.chainsValid) {
                    throw new Error(`Chain validation failed. Missing chains: ${assertions.missingChains.join(', ')}`);
                }

                if (assertions.chainCount !== 1) {
                    throw new Error(`Expected 1 chain, but found ${assertions.chainCount}`);
                }


            },
        );
    });

    it('should create a session with multiple EVM chains', async () => {
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

                const sessionResult = await MultichainTestDApp.createSessionWithNetworks(
                    MultichainUtilities.NETWORK_COMBINATIONS.ETHEREUM_POLYGON
                );

                const assertions = MultichainUtilities.generateSessionAssertions(
                    sessionResult,
                    MultichainUtilities.NETWORK_COMBINATIONS.ETHEREUM_POLYGON
                );

                MultichainUtilities.logSessionDetails(sessionResult, 'Multi-chain Test');

                if (!assertions.structureValid) {
                    throw new Error('Invalid session structure');
                }

                if (!assertions.success) {
                    throw new Error('Session creation failed');
                }

                if (!assertions.chainsValid) {
                    throw new Error(`Chain validation failed. Missing chains: ${assertions.missingChains.join(', ')}`);
                }

                if (assertions.chainCount !== 2) {
                    throw new Error(`Expected 2 chains, but found ${assertions.chainCount}`);
                }

            },
        );
    });

    it('should create a session with all available EVM networks', async () => {
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

                const sessionResult = await MultichainTestDApp.createSessionWithNetworks(
                    MultichainUtilities.NETWORK_COMBINATIONS.ALL_MAJOR_EVM
                );

                const assertions = MultichainUtilities.generateSessionAssertions(
                    sessionResult,
                    MultichainUtilities.NETWORK_COMBINATIONS.ALL_MAJOR_EVM
                );

                MultichainUtilities.logSessionDetails(sessionResult, 'All Networks Test');

                if (!assertions.structureValid) {
                    throw new Error('Invalid session structure');
                }

                if (!assertions.success) {
                    throw new Error('Session creation failed');
                }

                if (!assertions.foundChains.includes(MultichainUtilities.CHAIN_IDS.ETHEREUM_MAINNET)) {
                    throw new Error('Ethereum mainnet not found in session scopes');
                }

                if (assertions.chainCount <= 1) {
                    throw new Error(`Expected multiple chains, but found ${assertions.chainCount}`);
                }
            },
        );
    });

    it('should handle session creation with no networks selected', async () => {
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

                const sessionResult = await MultichainTestDApp.createSessionWithNetworks([]);

                const assertions = MultichainUtilities.generateSessionAssertions(sessionResult, []);
                MultichainUtilities.logSessionDetails(sessionResult, 'No Networks Test');

                if (!assertions.structureValid) {
                    throw new Error('Invalid session result type');
                }

                if (assertions.success) {
                    // Session created with some chains
                } else {
                    // Session creation failed as expected for no networks
                }
            },
        );
    });

    it('should get session information after creating a session', async () => {
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

                const createResult = await MultichainTestDApp.createSessionWithNetworks(
                    MultichainUtilities.NETWORK_COMBINATIONS.SINGLE_ETHEREUM
                );

                const createAssertions = MultichainUtilities.generateSessionAssertions(
                    createResult,
                    MultichainUtilities.NETWORK_COMBINATIONS.SINGLE_ETHEREUM
                );

                if (!createAssertions.success) {
                    throw new Error('Initial session creation failed');
                }

                await TestHelpers.delay(1000);

                const getSessionResult = await MultichainTestDApp.getSessionData();

                const getAssertions = MultichainUtilities.generateSessionAssertions(
                    getSessionResult,
                    MultichainUtilities.NETWORK_COMBINATIONS.SINGLE_ETHEREUM
                );

                if (!getAssertions.success) {
                    throw new Error('Failed to retrieve session data');
                }

                if (!getAssertions.chainsValid) {
                    throw new Error('Ethereum scope not found in retrieved session');
                }

                await TestHelpers.delay(500);
                const getSessionResult2 = await MultichainTestDApp.getSessionData();

                const getAssertions2 = MultichainUtilities.generateSessionAssertions(
                    getSessionResult2,
                    MultichainUtilities.NETWORK_COMBINATIONS.SINGLE_ETHEREUM
                );

                if (!getAssertions2.success) {
                    throw new Error('Failed to retrieve session data on second attempt');
                }

                const scopes1 = JSON.stringify(getSessionResult.sessionScopes);
                const scopes2 = JSON.stringify(getSessionResult2.sessionScopes);

                if (scopes1 !== scopes2) {
                    throw new Error('Session data inconsistent between calls');
                }

            },
        );
    });

    it('should verify session contains expected chains using helper method', async () => {
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

                const networksToTest = MultichainUtilities.NETWORK_COMBINATIONS.ETHEREUM_POLYGON;

                const sessionResult = await MultichainTestDApp.createSessionWithNetworks(networksToTest);

                const assertions = MultichainUtilities.generateSessionAssertions(sessionResult, networksToTest);

                if (!assertions.success) {
                    throw new Error('Session creation failed');
                }

                const chainsVerified = await MultichainTestDApp.verifySessionContainsChains(networksToTest);

                if (!chainsVerified) {
                    throw new Error('Chain verification failed');
                }

                const chainCount = await MultichainTestDApp.getSessionChainCount();
                console.log(`Session chain count: ${chainCount}`);

                if (chainCount !== networksToTest.length) {
                    throw new Error(`Expected ${networksToTest.length} chains, but count method returned ${chainCount}`);
                }

                if (assertions.chainCount !== networksToTest.length) {
                    throw new Error(`Utility chain count mismatch: expected ${networksToTest.length}, got ${assertions.chainCount}`);
                }

                MultichainUtilities.logSessionDetails(sessionResult, 'Helper Methods Test');

            },
        );
    });
});
