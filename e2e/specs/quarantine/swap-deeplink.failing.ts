'use strict';
/* eslint-disable no-console */
import { loginToApp } from '../../viewHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { AnvilManager } from '../../seeder/anvil-manager';
import {
  loadFixture,
  createMockAPIServer,
} from '../../framework/fixtures/FixtureHelper';
import TestHelpers from '../../helpers.js';
import FixtureServer from '../../framework/fixtures/FixtureServer';
import {
  getFixturesServerPort,
  AnvilPort,
} from '../../framework/fixtures/FixtureUtils';
import { SmokeTrade } from '../../tags.js';
import Assertions from '../../framework/Assertions';
import QuoteView from '../../pages/swaps/QuoteView';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { Assertions as FrameworkAssertions } from '../../framework';
import { testSpecificMock as swapTestSpecificMock } from '../swaps/helpers/swap-mocks';
import MockServerE2E from '../../api-mocking/MockServerE2E';

const fixtureServer: FixtureServer = new FixtureServer();

// Deep link URLs for testing unified swap/bridge experience
// Note: URLs use 'swap' terminology for backward compatibility but redirect to unified bridge experience
const SWAP_DEEPLINK_BASE = 'https://metamask.app.link/swap';
const SWAP_DEEPLINK_FULL = `${SWAP_DEEPLINK_BASE}?from=eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48&to=eip155:1/erc20:0xdAC17F958D2ee523a2206206994597C13D831ec7&amount=1000000`;

describe(
  SmokeTrade('Swap Deep Link Tests - Unified Bridge Experience'),
  (): void => {
    let localNode: AnvilManager;
    let mockServerInstance: MockServerE2E;

    beforeAll(async (): Promise<void> => {
      localNode = new AnvilManager();
      localNode.setStartOptions({ chainId: 1 });
      localNode.setServerPort(AnvilPort());
      await localNode.start();

      mockServerInstance = (await createMockAPIServer(swapTestSpecificMock))
        .mockServerInstance;

      await TestHelpers.reverseServerPort();
      const fixture = new FixtureBuilder()
        .withNetworkController({
          providerConfig: {
            chainId: '0x1',
            rpcUrl: `http://localhost:${AnvilPort()}`,
            type: 'custom',
            nickname: 'Localhost',
            ticker: 'ETH',
          },
        })
        .withMetaMetricsOptIn()
        .build();
      await fixtureServer.start();
      await loadFixture(fixtureServer, { fixture });
      await TestHelpers.launchApp({
        permissions: { notifications: 'YES' },
        launchArgs: {
          fixtureServerPort: `${getFixturesServerPort()}`,
          mockServerPort: `${mockServerInstance.getServerPort()}`,
        },
      });
      await loginToApp();
    });

    afterAll(async (): Promise<void> => {
      await fixtureServer.stop();
      if (mockServerInstance?.isStarted()) await mockServerInstance.stop();
      if (localNode) await localNode.stop();
    });

    beforeEach(async (): Promise<void> => {
      jest.setTimeout(120000);
    });

    it('should navigate to bridge view with full parameters (USDC to USDT)', async (): Promise<void> => {
      await TestHelpers.openDeepLink(SWAP_DEEPLINK_FULL);

      // Handle "Proceed with caution" modal that appears for deep links
      await Assertions.checkIfVisible(
        Matchers.getElementByText('Proceed with caution'),
        10000,
      );
      await Gestures.waitAndTap(Matchers.getElementByText('Continue'));

      // Wait for bridge view to load after modal is dismissed
      await FrameworkAssertions.expectElementToBeVisible(
        QuoteView.selectAmountLabel,
        {
          timeout: 10000,
        },
      );

      // Verify we can navigate back
      await Assertions.checkIfVisible(QuoteView.cancelButton, 10000);
      await QuoteView.tapOnCancelButton();

      // Should be back on wallet view - check for wallet elements
      await Assertions.checkIfNotVisible(QuoteView.selectAmountLabel, 5000);
    });

    it('should navigate to bridge view with no parameters', async (): Promise<void> => {
      await TestHelpers.openDeepLink(SWAP_DEEPLINK_BASE);

      // Handle "Proceed with caution" modal that appears for deep links
      await Assertions.checkIfVisible(
        Matchers.getElementByText('Proceed with caution'),
        10000,
      );
      await Gestures.waitAndTap(Matchers.getElementByText('Continue'));

      // Wait for bridge view to load after modal is dismissed
      await FrameworkAssertions.expectElementToBeVisible(
        QuoteView.selectAmountLabel,
        {
          timeout: 10000,
        },
      );

      // Verify we can navigate back
      await Assertions.checkIfVisible(QuoteView.cancelButton, 10000);
      await QuoteView.tapOnCancelButton();

      // Should be back on wallet view - check for wallet elements
      await Assertions.checkIfNotVisible(QuoteView.selectAmountLabel, 5000);
    });

    it('should handle invalid deep link parameters gracefully', async (): Promise<void> => {
      const invalidDeeplink = `${SWAP_DEEPLINK_BASE}?from=invalid&to=invalid&amount=invalid`;

      await TestHelpers.openDeepLink(invalidDeeplink);

      // Handle "Proceed with caution" modal that appears for deep links
      await Assertions.checkIfVisible(
        Matchers.getElementByText('Proceed with caution'),
        10000,
      );
      await Gestures.waitAndTap(Matchers.getElementByText('Continue'));

      // Wait for bridge view to load after modal is dismissed
      await FrameworkAssertions.expectElementToBeVisible(
        QuoteView.selectAmountLabel,
        {
          timeout: 10000,
        },
      );

      // Verify we can navigate back
      await Assertions.checkIfVisible(QuoteView.cancelButton, 10000);
      await QuoteView.tapOnCancelButton();

      // Should be back on wallet view - check for wallet elements
      await Assertions.checkIfNotVisible(QuoteView.selectAmountLabel, 5000);
    });
  },
);
