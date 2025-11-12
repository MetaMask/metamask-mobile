import '../../../../../util/test/integration/mocks';
import React from 'react';
import { renderIntegrationScreen } from '../../../../../util/test/integration/render';
import { initialState as BridgeMocksInitial } from '../../_mocks_/initialState';
import { mockQuoteWithMetadata } from '../../_mocks_/bridgeQuoteWithMetadata';
import { createStateFixture } from '../../../../../util/test/integration/stateFixture';
import Routes from '../../../../../constants/navigation/Routes';
import BridgeView from './index';

describe('BridgeView (integration - basic, no quotes)', () => {
  it('renders inputs and shows keypad state when inputs are not valid', () => {
    const state = createStateFixture({ base: 'empty' })
      .withMinimalBridgeController()
      .withMinimalAccounts()
      .withMinimalMainnetNetwork()
      .withMinimalMultichainNetwork(true)
      .withMinimalSmartTransactions()
      .withPreferences({
        smartTransactionsOptInStatus: false,
        useTokenDetection: false,
        tokenNetworkFilter: { '0x1': true },
      })
      .withMinimalGasFee()
      .withMinimalTransactionController()
      .withMinimalKeyringController()
      .withMinimalTokenRates()
      .withMinimalMultichainAssetsRates()
      .withAccountTreeForSelectedAccount()
      .withRemoteFeatureFlags({})
      .withOverrides({
        engine: {
          backgroundState: {
            // Minimal bridge slice shape to keep inputs invalid:
            // - no sourceAmount
            // - no sourceToken / destToken
            BridgeController: {
              state: {
                quotesLastFetched: 0,
              },
            },
          },
        },
      } as unknown as Record<string, unknown>)
      .build() as unknown as Record<string, unknown>;

    const { getByTestId, queryByTestId } = renderIntegrationScreen(
      BridgeView as unknown as React.ComponentType,
      { name: Routes.BRIDGE.BRIDGE_VIEW },
      { state },
    );

    // Input areas are rendered
    expect(getByTestId('source-token-area')).toBeTruthy();
    expect(getByTestId('dest-token-area-input')).toBeTruthy();

    // Confirm button should NOT be rendered without valid inputs and quote
    expect(queryByTestId('bridge-confirm-button')).toBeNull();
  });

  it('enables confirm button when source/dest tokens and amount are set and quote is available', () => {
    const bridgeBg = (
      BridgeMocksInitial.engine as unknown as {
        backgroundState: Record<string, unknown>;
      }
    ).backgroundState;
    const now = Date.now();
    const state = createStateFixture({ base: 'empty' })
      .withMinimalBridgeController()
      .withMinimalAccounts()
      .withMinimalMainnetNetwork()
      .withMinimalMultichainNetwork(true)
      .withMinimalSmartTransactions()
      .withPreferences({
        smartTransactionsOptInStatus: false,
        useTokenDetection: false,
        tokenNetworkFilter: { '0x1': true },
      })
      .withMinimalGasFee()
      .withMinimalTransactionController()
      .withMinimalKeyringController()
      .withMinimalTokenRates()
      .withMinimalMultichainAssetsRates()
      .withAccountTreeForSelectedAccount()
      .withOverrides({
        bridge: {
          sourceAmount: '1',
          sourceToken: {
            address: '0x0000000000000000000000000000000000000000',
            chainId: '0x1',
            decimals: 18,
            symbol: 'ETH',
            name: 'Ether',
          },
          destToken: {
            address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
            chainId: '0x1',
            decimals: 6,
            symbol: 'USDC',
            name: 'USD Coin',
          },
        },
        engine: {
          backgroundState: {
            ...bridgeBg,
            RemoteFeatureFlagController: bridgeBg.RemoteFeatureFlagController,
            CurrencyRateController: bridgeBg.CurrencyRateController,
            TokenRatesController: bridgeBg.TokenRatesController,
            MultichainAssetsRatesController:
              bridgeBg.MultichainAssetsRatesController,
            NetworkController: {
              ...(bridgeBg.NetworkController as Record<string, unknown>),
              selectedNetworkClientId: 'mainnet',
            },
            MultichainNetworkController: {
              ...(bridgeBg.MultichainNetworkController as Record<
                string,
                unknown
              >),
              isEvmSelected: true,
            },
            BridgeController: {
              ...(bridgeBg.BridgeController as Record<string, unknown>),
              quotes: [
                mockQuoteWithMetadata as unknown as Record<string, unknown>,
              ],
              recommendedQuote: mockQuoteWithMetadata as unknown as Record<
                string,
                unknown
              >,
              quotesLastFetched: now,
              quotesLoadingStatus: 'SUCCEEDED',
              quoteFetchError: null,
            },
          },
        },
      } as unknown as Record<string, unknown>)
      .build() as unknown as Record<string, unknown>;

    const { getByTestId } = renderIntegrationScreen(
      BridgeView as unknown as React.ComponentType,
      { name: Routes.BRIDGE.BRIDGE_VIEW },
      { state },
    );

    const button = getByTestId('bridge-confirm-button');
    expect(button).toBeTruthy();
    expect(
      (button as unknown as { props: { isDisabled?: boolean } }).props
        .isDisabled,
    ).not.toBe(true);
  });
});
