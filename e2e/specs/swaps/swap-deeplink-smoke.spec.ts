'use strict';
/* eslint-disable no-console */
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { LocalNode, LocalNodeType } from '../../framework/types';
import { loginToApp } from '../../viewHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { AnvilManager } from '../../seeder/anvil-manager';
import { AnvilPort } from '../../framework/fixtures/FixtureUtils';
import { SmokeTrade } from '../../tags';
import Assertions from '../../framework/Assertions';
import QuoteView from '../../pages/swaps/QuoteView';
import Gestures from '../../framework/Gestures';
import { testSpecificMock } from './helpers/swap-mocks';
import WalletView from '../../pages/wallet/WalletView';
import DeeplinkModal from '../../pages/swaps/Deeplink';

// Deep link URLs for testing unified swap/bridge experience
// Note: URLs use 'swap' terminology for backward compatibility but redirect to unified bridge experience
const SWAP_DEEPLINK_BASE = 'https://metamask.app.link/swap';
const SWAP_DEEPLINK_FULL = `${SWAP_DEEPLINK_BASE}?from=eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48&to=eip155:1/erc20:0xdAC17F958D2ee523a2206206994597C13D831ec7&amount=1000000`;

describe(
  SmokeTrade('Swap Deep Link Tests - Unified Bridge Experience'),
  (): void => {
    const chainId = '0x1';

    beforeEach(async (): Promise<void> => {
      jest.setTimeout(120000);
    });

    it('navigate to bridge view with full parameters (USDC to USDT)', async (): Promise<void> => {
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
                  chainId,
                  rpcUrl: `http://localhost:${rpcPort ?? AnvilPort()}`,
                  type: 'custom',
                  nickname: 'Localhost',
                  ticker: 'ETH',
                },
              })
              .withMetaMetricsOptIn()
              .build();
          },
          localNodeOptions: [
            {
              type: LocalNodeType.anvil,
              options: {
                chainId: 1,
              },
            },
          ],
          testSpecificMock,
          restartDevice: true,
        },
        async () => {
          await loginToApp();
          await device.sendToHome();
          await device.launchApp({
            url: SWAP_DEEPLINK_FULL,
          });

          // Handle "Proceed with caution" modal that appears for deep links
          await Assertions.expectElementToBeVisible(
            DeeplinkModal.proceedWithCaution,
          );
          await Gestures.waitAndTap(DeeplinkModal.continueButton);

          // Wait for bridge view to load after modal is dismissed

          // Check that USDC and USDT tokens are displayed (using text display check
          // since the token area containers have additional text like labels)
          await Assertions.expectTextDisplayed('USDC');
          await Assertions.expectTextDisplayed('USDT');
          await Assertions.expectElementToHaveText(
            QuoteView.amountInput,
            '1.0',
          );
          await Assertions.expectElementToBeVisible(QuoteView.confirmSwap);

          // Verify we can navigate back
          await Assertions.expectElementToBeVisible(QuoteView.backButton);
          await QuoteView.tapOnBackButton();

          // Should be back on wallet view
          await Assertions.expectElementToBeVisible(WalletView.container);
        },
      );
    });

    it('navigate to bridge view with no parameters', async (): Promise<void> => {
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
                  chainId,
                  rpcUrl: `http://localhost:${rpcPort ?? AnvilPort()}`,
                  type: 'custom',
                  nickname: 'Localhost',
                  ticker: 'ETH',
                },
              })
              .withMetaMetricsOptIn()
              .build();
          },
          localNodeOptions: [
            {
              type: LocalNodeType.anvil,
              options: {
                chainId: 1,
              },
            },
          ],
          testSpecificMock,
          restartDevice: true,
        },
        async () => {
          await loginToApp();
          await device.sendToHome();
          await device.launchApp({
            url: SWAP_DEEPLINK_BASE,
          });

          // Handle "Proceed with caution" modal that appears for deep links
          await Assertions.expectElementToBeVisible(
            DeeplinkModal.proceedWithCaution,
          );
          await Gestures.waitAndTap(DeeplinkModal.continueButton);

          // Check that we are on the quote view with default state
          await Assertions.expectElementToBeVisible(
            QuoteView.selectAmountLabel,
          );

          // Verify we can navigate back
          await Assertions.expectElementToBeVisible(QuoteView.backButton);
          await QuoteView.tapOnBackButton();

          // Should be back on wallet view
          await Assertions.expectElementToBeVisible(WalletView.container);
        },
      );
    });

    it('handle invalid deep link parameters gracefully', async (): Promise<void> => {
      const invalidDeeplink = `${SWAP_DEEPLINK_BASE}?from=invalid&to=invalid&amount=invalid`;

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
                  chainId,
                  rpcUrl: `http://localhost:${rpcPort ?? AnvilPort()}`,
                  type: 'custom',
                  nickname: 'Localhost',
                  ticker: 'ETH',
                },
              })
              .withMetaMetricsOptIn()
              .build();
          },
          localNodeOptions: [
            {
              type: LocalNodeType.anvil,
              options: {
                chainId: 1,
              },
            },
          ],
          testSpecificMock,
          restartDevice: true,
        },
        async () => {
          await loginToApp();
          await device.sendToHome();
          await device.launchApp({
            url: invalidDeeplink,
          });

          // Handle "Proceed with caution" modal that appears for deep links
          await Assertions.expectElementToBeVisible(
            DeeplinkModal.proceedWithCaution,
          );
          await Gestures.waitAndTap(DeeplinkModal.continueButton);

          // Wait for bridge view to load after modal is dismissed
          await Assertions.expectElementToBeVisible(
            QuoteView.selectAmountLabel,
          );

          // Verify we can navigate back
          await Assertions.expectElementToBeVisible(QuoteView.backButton);
          await QuoteView.tapOnBackButton();

          // Should be back on wallet view
          await Assertions.expectElementToBeVisible(WalletView.container);
        },
      );
    });
  },
);
