import '../../../../../util/test/component-view/mocks';
import { mockQuoteWithMetadata } from '../../_mocks_/bridgeQuoteWithMetadata';
import { renderBridgeView } from '../../../../../util/test/component-view/renderers/bridge';
import { fireEvent, waitFor, within } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import React from 'react';
import { Text } from 'react-native';
import { renderScreenWithRoutes } from '../../../../../util/test/component-view/render';
import Routes from '../../../../../constants/navigation/Routes';
import { initialStateBridge } from '../../../../../util/test/component-view/presets/bridge';
import BridgeView from './index';
import { describeForPlatforms } from '../../../../../util/test/platform';
import { BridgeViewSelectorsIDs } from './BridgeView.testIds';
import { BuildQuoteSelectors } from '../../../Ramp/Aggregator/Views/BuildQuote/BuildQuote.testIds';
import { CommonSelectorsIDs } from '../../../../../util/Common.testIds';

describeForPlatforms('BridgeView', () => {
  it('renders input areas and hides confirm button without tokens or amount', () => {
    const { getByTestId, queryByTestId } = renderBridgeView({
      overrides: {
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
      } as unknown as Record<string, unknown>,
    });

    // Input areas are rendered
    expect(
      getByTestId(BridgeViewSelectorsIDs.SOURCE_TOKEN_AREA),
    ).toBeOnTheScreen();
    expect(
      getByTestId(BridgeViewSelectorsIDs.DESTINATION_TOKEN_AREA),
    ).toBeOnTheScreen();

    // Confirm button should NOT be rendered without valid inputs and quote
    expect(queryByTestId(BridgeViewSelectorsIDs.CONFIRM_BUTTON)).toBeNull();
  });

  it('types 9.5 with keypad and displays $19,000.00 fiat value', async () => {
    const { getByTestId, queryByTestId, findByText, findByDisplayValue } =
      renderBridgeView({
        deterministicFiat: true,
        overrides: {
          bridge: {
            sourceAmount: '0',
            sourceToken: {
              address: '0x0000000000000000000000000000000000000000',
              chainId: '0x1',
              decimals: 18,
              symbol: 'ETH',
              name: 'Ether',
            },
            destToken: undefined,
          },
        } as unknown as Record<string, unknown>,
      });

    // Close possible banner to reveal keypad
    const closeBanner = queryByTestId(
      CommonSelectorsIDs.BANNER_CLOSE_BUTTON_ICON,
    );
    if (closeBanner) {
      fireEvent.press(closeBanner);
    }

    // Ensure keypad is visible
    await waitFor(() => {
      expect(
        getByTestId(BuildQuoteSelectors.KEYPAD_DELETE_BUTTON),
      ).toBeOnTheScreen();
    });

    // Type 9.5 using keypad buttons inside the bridge scroll container
    const scroll = getByTestId(BridgeViewSelectorsIDs.BRIDGE_VIEW_SCROLL);
    fireEvent.press(within(scroll).getByText('9'));
    fireEvent.press(within(scroll).getByText('.'));
    fireEvent.press(within(scroll).getByText('5'));

    // Assert amount and exact fiat conversion (9.5 * $2000 = $19,000.00)
    expect(await findByDisplayValue('9.5')).toBeOnTheScreen();
    expect(await findByText('$19,000.00')).toBeOnTheScreen();
  });

  it('renders enabled confirm button with tokens, amount and recommended quote', () => {
    const now = Date.now();
    const { getByTestId } = renderBridgeView({
      deterministicFiat: true,
      overrides: {
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
            BridgeController: {
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
      } as unknown as Record<string, unknown>,
    });

    const button = getByTestId(BridgeViewSelectorsIDs.CONFIRM_BUTTON);
    expect(button).toBeOnTheScreen();
    expect(
      (button as unknown as { props: { isDisabled?: boolean } }).props
        .isDisabled,
    ).not.toBe(true);
  });

  it('displays no MM fee disclaimer for mUSD destination with zero MM fee', async () => {
    const musdAddress = '0xaca92e438df0b2401ff60da7e4337b687a2435da';
    const now = Date.now();
    // Clone and enforce 0 bps fee and gasIncluded on the active/recommended quote
    const active = {
      ...(mockQuoteWithMetadata as unknown as Record<string, unknown>),
    };
    const currentQuote = (active.quote as Record<string, unknown>) ?? {};
    active.quote = {
      ...currentQuote,
      feeData: {
        metabridge: { quoteBpsFee: 0 },
      },
      gasIncluded: true,
      srcChainId: 1,
      destChainId: 1,
    };

    const { findByText } = renderBridgeView({
      deterministicFiat: true,
      overrides: {
        bridge: {
          sourceAmount: '1.0',
          sourceToken: {
            address: '0x0000000000000000000000000000000000000000',
            chainId: '0x1',
            decimals: 18,
            symbol: 'ETH',
            name: 'Ether',
          },
          destToken: {
            address: musdAddress,
            chainId: '0x1',
            decimals: 18,
            symbol: 'mUSD',
            name: 'mStable USD',
          },
        },
        engine: {
          backgroundState: {
            BridgeController: {
              quotes: [active as unknown as Record<string, unknown>],
              recommendedQuote: active as unknown as Record<string, unknown>,
              quotesLastFetched: now,
              quotesLoadingStatus: 'SUCCEEDED',
              quoteFetchError: null,
            },
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                bridgeConfigV2: {
                  minimumVersion: '0.0.0',
                  maxRefreshCount: 5,
                  refreshRate: 30000,
                  support: true,
                  chains: {
                    'eip155:1': {
                      isActiveSrc: true,
                      isActiveDest: true,
                      noFeeAssets: [musdAddress],
                    },
                  },
                },
              },
            },
          },
        },
      } as unknown as Record<string, unknown>,
    });

    const expected = strings('bridge.no_mm_fee_disclaimer', {
      destTokenSymbol: 'mUSD',
    });
    expect(await findByText(expected)).toBeOnTheScreen();
  });

  it('hides keypad when refreshing quote with input unfocused', () => {
    const now = Date.now();
    const previousQuote = { ...mockQuoteWithMetadata };

    const { queryByTestId } = renderBridgeView({
      deterministicFiat: true,
      overrides: {
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
            BridgeController: {
              quotes: [previousQuote as unknown as Record<string, unknown>],
              recommendedQuote: previousQuote as unknown as Record<
                string,
                unknown
              >,
              quotesLastFetched: now - 1000,
              quotesLoadingStatus: 'LOADING',
              quoteFetchError: null,
            },
          },
        },
      } as unknown as Record<string, unknown>,
    });

    // Keypad should NOT be visible when refreshing quote with valid inputs and unfocused input
    // This simulates the scenario after user changes slippage - quote is loading but input is not focused
    expect(queryByTestId(BuildQuoteSelectors.KEYPAD_DELETE_BUTTON)).toBeNull();
  });

  it('navigates to dest token selector on press', async () => {
    const TokenSelectorProbe: React.FC<{
      route?: { params?: { type?: string } };
    }> = (props) => (
      // eslint-disable-next-line react-native/no-raw-text
      <Text testID="token-selector-probe">{props?.route?.params?.type}</Text>
    );
    const state = initialStateBridge()
      .withOverrides({
        bridge: {
          sourceToken: {
            address: '0x0000000000000000000000000000000000000000',
            chainId: '0x1',
            decimals: 18,
            symbol: 'ETH',
            name: 'Ether',
          },
        },
      } as unknown as Record<string, unknown>)
      .build() as unknown as Record<string, unknown>;
    const { findByText } = renderScreenWithRoutes(
      // Component
      BridgeView as unknown as React.ComponentType,
      // Entry route
      { name: Routes.BRIDGE.ROOT },
      // Register token selector route to probe params
      [
        {
          name: Routes.BRIDGE.TOKEN_SELECTOR,
          Component:
            TokenSelectorProbe as unknown as React.ComponentType<unknown>,
        },
      ],
      // State
      { state },
    );

    fireEvent.press(await findByText('Swap to'));
    // TokenInputArea navigates to TOKEN_SELECTOR with { type: 'dest' }
    expect(await findByText('dest')).toBeOnTheScreen();
  });
});
