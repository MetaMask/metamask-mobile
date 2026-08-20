import '../../../../../../tests/component-view/mocks';
import { mockQuoteWithMetadata } from '../../_mocks_/bridgeQuoteWithMetadata';
import { renderBridgeView } from '../../../../../../tests/component-view/renderers/bridge';
import { act, fireEvent, waitFor, within } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import React from 'react';
import { Text } from 'react-native';
import {
  renderComponentViewScreen,
  renderScreenWithRoutes,
} from '../../../../../../tests/component-view/render';
import Routes from '../../../../../constants/navigation/Routes';
import { initialStateBridge } from '../../../../../../tests/component-view/presets/bridge';
import BridgeView from './index';
import { describeForPlatforms } from '../../../../../../tests/component-view/platform';
import { BridgeViewSelectorsIDs } from './BridgeView.testIds';
import { BuildQuoteSelectors } from '../../../Ramp/Aggregator/Views/BuildQuote/BuildQuote.testIds';
import { CommonSelectorsIDs } from '../../../../../util/Common.testIds';
import {
  setDestToken,
  setSlippage,
  setSourceAmount,
  setSourceToken,
} from '../../../../../core/redux/slices/bridge';
import { FEATURE_FLAG_NAME as RWA_FEATURE_FLAG_NAME } from '../../../../../selectors/featureFlagController/rwa';
import { BridgeViewMode, type BridgeToken } from '../../types';
import { BridgeTokenSelector } from '../../components/BridgeTokenSelector/BridgeTokenSelector';
import Engine from '../../../../../core/Engine';
import type { DeepPartial } from '../../../../../util/test/renderWithProvider';
import type { RootState } from '../../../../../reducers';
import {
  FeatureId,
  RequestStatus,
  QuoteStreamCompleteReason,
  UnifiedSwapBridgeEventName,
} from '@metamask/bridge-controller';
import {
  DEFAULT_BRIDGE,
  ETH_SOURCE,
  USDC_DEST,
  USDT_DEST,
} from '../../_mocks_/bridgeViewTestConstants';
import { BridgeTrendingTokensSectionTestIds } from '../../components/BridgeTrendingTokensSection/BridgeTrendingTokensSection.testIds';
import { TrendingTokensBottomSheetTestIds } from '../../../Trending/components/TrendingTokensBottomSheet/TrendingTokensBottomSheet.testIds';
import { SWAP_DISCOVERY_FEED_REVAMP_AB_KEY } from '../../components/SwapDiscoveryFeed/abTestConfig';
import { getTrendingTokenRowItemTestId } from '../../../Trending/components/TrendingTokenRowItem/TrendingTokenRowItem.testIds';
import {
  setupTrendingApiFetchMock,
  clearTrendingApiMocks,
  mockTrendingTokensData,
} from '../../../../../../tests/component-view/api-mocking/trending';
import { merge } from 'lodash';

const HOUR_MS = 60 * 60 * 1000;

const createStockRwaToken = ({
  nowMs,
  inRegularHours,
  inOffHours,
}: {
  nowMs: number;
  inRegularHours: boolean;
  inOffHours: boolean;
}): BridgeToken => ({
  address: '0x1111111111111111111111111111111111111111',
  symbol: 'AAPL',
  name: 'Apple',
  decimals: 18,
  chainId: '0x1',
  rwaData: {
    instrumentType: 'stock',
    market: inRegularHours
      ? {
          nextOpen: new Date(nowMs - HOUR_MS).toISOString(),
          nextClose: new Date(nowMs + 6 * HOUR_MS).toISOString(),
        }
      : {
          nextOpen: new Date(nowMs + 12 * HOUR_MS).toISOString(),
          nextClose: new Date(nowMs + 20 * HOUR_MS).toISOString(),
        },
    ...(inOffHours
      ? {
          offhours: {
            nextOpen: new Date(nowMs - HOUR_MS).toISOString(),
            nextClose: new Date(nowMs + 2 * HOUR_MS).toISOString(),
          },
        }
      : {}),
  } as BridgeToken['rwaData'],
});

const defaultBridgeWithTokens = (overrides?: Record<string, unknown>) => {
  const { bridge: bridgeOverrides, ...rest } = overrides ?? {};
  return renderBridgeView({
    deterministicFiat: true,
    overrides: {
      bridge: {
        ...DEFAULT_BRIDGE,
        ...(bridgeOverrides as Record<string, unknown>),
      },
      ...rest,
    } as unknown as DeepPartial<RootState>,
  });
};

describeForPlatforms('BridgeView', () => {
  beforeEach(() => {
    // testSetup.js mocks Date.now to always return 123, which breaks lodash debounce
    // (timeSinceLastCall = 123 - 123 = 0 never reaches the wait threshold).
    // Restore it to a real implementation so debounce-based tests work correctly.
    Date.now = () => new Date().getTime();
  });

  it('renders input areas and hides confirm button without tokens or amount', () => {
    const { getByTestId, queryByTestId } = renderBridgeView({
      overrides: {
        engine: {
          backgroundState: {
            BridgeController: {
              state: { quotesLastFetched: 0 },
            },
          },
        },
      } as unknown as Record<string, unknown>,
    });

    expect(
      getByTestId(BridgeViewSelectorsIDs.SOURCE_TOKEN_AREA),
    ).toBeOnTheScreen();
    expect(
      getByTestId(BridgeViewSelectorsIDs.DESTINATION_TOKEN_AREA),
    ).toBeOnTheScreen();
    expect(queryByTestId(BridgeViewSelectorsIDs.CONFIRM_BUTTON)).toBeNull();
  });

  describe('tabs', () => {
    it('shows the market tab with its label by default, then switches to the limit tab and hides slippage settings on press', async () => {
      const { getByTestId, queryByTestId } = renderBridgeView();

      expect(getByTestId(BridgeViewSelectorsIDs.TABS_BAR)).toBeOnTheScreen();
      expect(
        getByTestId(BridgeViewSelectorsIDs.SOURCE_TOKEN_AREA),
      ).toBeOnTheScreen();
      expect(
        getByTestId(BridgeViewSelectorsIDs.SLIPPAGE_SETTINGS_BUTTON),
      ).toBeOnTheScreen();
      expect(
        getByTestId(`${BridgeViewSelectorsIDs.MARKET_TAB}-label`),
      ).toHaveTextContent(strings('bridge.tabs.market'));
      expect(
        queryByTestId(BridgeViewSelectorsIDs.LIMIT_ORDER_CONTAINER),
      ).not.toBeOnTheScreen();
      expect(
        queryByTestId(BridgeViewSelectorsIDs.RECURRING_BUY_CONTAINER),
      ).not.toBeOnTheScreen();

      fireEvent.press(getByTestId(BridgeViewSelectorsIDs.LIMIT_TAB));

      await waitFor(() => {
        expect(
          getByTestId(BridgeViewSelectorsIDs.LIMIT_ORDER_CONTAINER),
        ).toBeOnTheScreen();
      });
      expect(
        queryByTestId(BridgeViewSelectorsIDs.SOURCE_TOKEN_AREA),
      ).not.toBeOnTheScreen();
      expect(
        queryByTestId(BridgeViewSelectorsIDs.SLIPPAGE_SETTINGS_BUTTON),
      ).not.toBeOnTheScreen();
    });

    it('labels the limit and recurring tabs, then switches to the recurring tab and replaces the market content', async () => {
      const { getByTestId, queryByTestId } = renderBridgeView();

      expect(
        getByTestId(`${BridgeViewSelectorsIDs.LIMIT_TAB}-label`),
      ).toHaveTextContent(strings('bridge.tabs.limit'));
      expect(
        getByTestId(`${BridgeViewSelectorsIDs.RECURRING_TAB}-label`),
      ).toHaveTextContent(strings('bridge.tabs.recurring'));

      fireEvent.press(getByTestId(BridgeViewSelectorsIDs.RECURRING_TAB));

      await waitFor(() => {
        expect(
          getByTestId(BridgeViewSelectorsIDs.RECURRING_BUY_CONTAINER),
        ).toBeOnTheScreen();
      });
      expect(
        queryByTestId(BridgeViewSelectorsIDs.SOURCE_TOKEN_AREA),
      ).not.toBeOnTheScreen();
    });

    it('restores the market content when returning to the market tab', async () => {
      const { getByTestId, queryByTestId } = renderBridgeView();

      fireEvent.press(getByTestId(BridgeViewSelectorsIDs.LIMIT_TAB));
      await waitFor(() => {
        expect(
          getByTestId(BridgeViewSelectorsIDs.LIMIT_ORDER_CONTAINER),
        ).toBeOnTheScreen();
      });

      fireEvent.press(getByTestId(BridgeViewSelectorsIDs.MARKET_TAB));

      await waitFor(() => {
        expect(
          getByTestId(BridgeViewSelectorsIDs.SOURCE_TOKEN_AREA),
        ).toBeOnTheScreen();
      });
      expect(
        queryByTestId(BridgeViewSelectorsIDs.LIMIT_ORDER_CONTAINER),
      ).not.toBeOnTheScreen();
    });

    it('re-anchors the destination to the source token default pair when returning to the market tab', async () => {
      // The user picks a Robinhood-chain pair on the Limit tab and goes back to
      // Market, which anchors its source token from the route params. The
      // destination has to follow that source instead of being left behind on
      // the Robinhood chain, which would turn a swap into a cross-chain bridge.
      const robinhoodChainId = '0x1237';
      const robinhoodEth: BridgeToken = {
        address: '0x0000000000000000000000000000000000000000',
        chainId: robinhoodChainId,
        decimals: 18,
        symbol: 'ETH',
        name: 'Ether',
      };
      const robinhoodUsde: BridgeToken = {
        address: '0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34',
        chainId: robinhoodChainId,
        decimals: 18,
        symbol: 'USDe',
        name: 'Ethena USDe',
      };
      const state = initialStateBridge({ deterministicFiat: true })
        .withOverrides({
          bridge: { ...DEFAULT_BRIDGE },
        } as unknown as DeepPartial<RootState>)
        .build();

      const { getByTestId, store } = renderComponentViewScreen(
        BridgeView as unknown as React.ComponentType,
        { name: Routes.BRIDGE.BRIDGE_VIEW },
        { state },
        {
          sourcePage: 'test',
          bridgeViewMode: BridgeViewMode.Unified,
          sourceToken: ETH_SOURCE,
        },
      );

      fireEvent.press(getByTestId(BridgeViewSelectorsIDs.LIMIT_TAB));
      await waitFor(() => {
        expect(
          getByTestId(BridgeViewSelectorsIDs.LIMIT_ORDER_CONTAINER),
        ).toBeOnTheScreen();
      });

      act(() => {
        store.dispatch(setSourceToken(robinhoodEth));
        store.dispatch(setDestToken(robinhoodUsde));
      });

      fireEvent.press(getByTestId(BridgeViewSelectorsIDs.MARKET_TAB));

      await waitFor(() => {
        expect(store.getState().bridge.sourceToken?.chainId).toBe('0x1');
      });
      await waitFor(() => {
        expect(store.getState().bridge.destToken).toEqual(
          expect.objectContaining({ symbol: 'mUSD', chainId: '0x1' }),
        );
      });
      expect(store.getState().bridge.isDestTokenManuallySet).toBe(false);
    });

    it('re-anchors the destination to the source token chain when returning to the market tab without a route source token', async () => {
      // Same as above, but Market has no source token on its route params, so it
      // keeps the source the Limit tab left in Redux. The destination has to
      // follow that source's chain rather than the bip44 default pair, whose
      // dest asset always sits on Ethereum.
      const bscUsdt: BridgeToken = {
        address: '0x55d398326f99059ff775485246999027b3197955',
        chainId: '0x38',
        decimals: 18,
        symbol: 'USDT',
        name: 'Tether USD',
      };
      const bscNative: BridgeToken = {
        address: '0x0000000000000000000000000000000000000000',
        chainId: '0x38',
        decimals: 18,
        symbol: 'BNB',
        name: 'BNB',
      };
      const state = initialStateBridge({ deterministicFiat: true })
        .withOverrides({
          bridge: { ...DEFAULT_BRIDGE },
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  // The bip44 default pair is what a source token left on
                  // another chain could wrongly get paired with.
                  bridgeConfigV2: {
                    minimumVersion: '0.0.0',
                    maxRefreshCount: 5,
                    refreshRate: 30000,
                    support: true,
                    chains: {
                      'eip155:1': { isActiveSrc: true, isActiveDest: true },
                      'eip155:56': { isActiveSrc: true, isActiveDest: true },
                    },
                    bip44DefaultPairs: {
                      eip155: {
                        other: {},
                        standard: {
                          'eip155:1/slip44:60':
                            'eip155:1/erc20:0xaca92e438df0b2401ff60da7e4337b687a2435da',
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        } as unknown as DeepPartial<RootState>)
        .build();

      const { getByTestId, store } = renderComponentViewScreen(
        BridgeView as unknown as React.ComponentType,
        { name: Routes.BRIDGE.BRIDGE_VIEW },
        { state },
        {
          sourcePage: 'test',
          bridgeViewMode: BridgeViewMode.Unified,
        },
      );

      fireEvent.press(getByTestId(BridgeViewSelectorsIDs.LIMIT_TAB));
      await waitFor(() => {
        expect(
          getByTestId(BridgeViewSelectorsIDs.LIMIT_ORDER_CONTAINER),
        ).toBeOnTheScreen();
      });

      act(() => {
        store.dispatch(setSourceToken(bscNative));
        store.dispatch(setDestToken(bscUsdt));
      });

      fireEvent.press(getByTestId(BridgeViewSelectorsIDs.MARKET_TAB));

      await waitFor(() => {
        expect(
          getByTestId(BridgeViewSelectorsIDs.SOURCE_TOKEN_AREA),
        ).toBeOnTheScreen();
      });
      await waitFor(() => {
        expect(store.getState().bridge.destToken).toEqual(
          expect.objectContaining({ symbol: 'USDT', chainId: '0x38' }),
        );
      });
      expect(store.getState().bridge.sourceToken?.chainId).toBe('0x38');
    });

    it('clears the amount inputs and stops controller polling after switching away from the market tab, keeping the selected tokens', async () => {
      const { getByTestId, store } = defaultBridgeWithTokens();

      expect(store.getState().bridge.sourceToken).toBeTruthy();
      expect(store.getState().bridge.sourceAmount).toBe('1');

      fireEvent.press(getByTestId(BridgeViewSelectorsIDs.LIMIT_TAB));

      await waitFor(() => {
        expect(
          getByTestId(BridgeViewSelectorsIDs.LIMIT_ORDER_CONTAINER),
        ).toBeOnTheScreen();
      });
      await waitFor(() => {
        expect(store.getState().bridge.sourceAmount).toBeUndefined();
      });
      // The selected tokens are preserved so Market shows the same pair on return.
      expect(store.getState().bridge.sourceToken).toBeTruthy();
      expect(Engine.context.BridgeController.resetState).toHaveBeenCalled();
    });

    describe('feature flags', () => {
      it('hides the tabs bar and keeps the market view functional when both Limit and Recurring flags are disabled', async () => {
        const { getByTestId, queryByTestId, store } = renderBridgeView({
          overrides: {
            engine: {
              backgroundState: {
                RemoteFeatureFlagController: {
                  remoteFeatureFlags: {
                    swapsLimitOrder: { enabled: false },
                    swapsRecurringBuy: { enabled: false },
                  },
                },
              },
            },
          } as unknown as DeepPartial<RootState>,
        });

        expect(
          queryByTestId(BridgeViewSelectorsIDs.TABS_BAR),
        ).not.toBeOnTheScreen();
        expect(
          queryByTestId(BridgeViewSelectorsIDs.LIMIT_TAB),
        ).not.toBeOnTheScreen();
        expect(
          queryByTestId(BridgeViewSelectorsIDs.RECURRING_TAB),
        ).not.toBeOnTheScreen();
        expect(
          getByTestId(BridgeViewSelectorsIDs.SOURCE_TOKEN_AREA),
        ).toBeOnTheScreen();

        act(() => {
          store.dispatch(setSourceAmount('1'));
        });

        await waitFor(() => {
          expect(store.getState().bridge.sourceAmount).toBe('1');
        });
      });

      it('shows only the enabled tab when a single WIP flag is enabled and lets the user switch to it', async () => {
        const { getByTestId, queryByTestId } = renderBridgeView({
          overrides: {
            engine: {
              backgroundState: {
                RemoteFeatureFlagController: {
                  remoteFeatureFlags: {
                    swapsLimitOrder: { enabled: true },
                    swapsRecurringBuy: { enabled: false },
                  },
                },
              },
            },
          } as unknown as DeepPartial<RootState>,
        });

        expect(getByTestId(BridgeViewSelectorsIDs.TABS_BAR)).toBeOnTheScreen();
        expect(getByTestId(BridgeViewSelectorsIDs.LIMIT_TAB)).toBeOnTheScreen();
        expect(
          queryByTestId(BridgeViewSelectorsIDs.RECURRING_TAB),
        ).not.toBeOnTheScreen();

        fireEvent.press(getByTestId(BridgeViewSelectorsIDs.LIMIT_TAB));

        await waitFor(() => {
          expect(
            getByTestId(BridgeViewSelectorsIDs.LIMIT_ORDER_CONTAINER),
          ).toBeOnTheScreen();
        });
      });
    });
  });

  it('types 9.5 with keypad and displays $19,000.00 fiat value', async () => {
    const {
      getByTestId,
      queryByTestId,
      getByText,
      findByText,
      findByDisplayValue,
    } = defaultBridgeWithTokens({
      bridge: {
        sourceAmount: '0',
        sourceToken: ETH_SOURCE,
        destToken: undefined,
      },
    } as unknown as Record<string, unknown>);

    const closeBanner = queryByTestId(
      CommonSelectorsIDs.BANNER_CLOSE_BUTTON_ICON,
    );
    if (closeBanner) {
      fireEvent.press(closeBanner);
    }

    const sourceInput = getByTestId(BridgeViewSelectorsIDs.SOURCE_TOKEN_INPUT);
    fireEvent(sourceInput, 'pressIn');

    // Keypad opens on source input interaction
    await waitFor(() => {
      expect(
        getByTestId(BuildQuoteSelectors.KEYPAD_DELETE_BUTTON),
      ).toBeOnTheScreen();
    });

    // Keypad is in SwapsKeypad (sibling of ScrollView), not inside bridge-view-scroll
    fireEvent.press(getByText('9'));
    fireEvent.press(getByText('.'));
    fireEvent.press(getByText('5'));

    expect(await findByDisplayValue('9.5')).toBeOnTheScreen();
    expect(await findByText('$19,000.00')).toBeOnTheScreen();
  });

  it('tracks source input denomination toggle', () => {
    jest.clearAllMocks();
    const { getByTestId } = defaultBridgeWithTokens({
      bridge: {
        sourceAmount: '1',
        sourceToken: ETH_SOURCE,
        destToken: USDC_DEST,
      },
    } as unknown as Record<string, unknown>);

    fireEvent.press(
      getByTestId(BridgeViewSelectorsIDs.SOURCE_AMOUNT_TYPE_TOGGLE),
    );

    expect(
      Engine.context.BridgeController.setInputPrimaryDenomination,
    ).toHaveBeenCalledWith('fiat_value');
    expect(
      Engine.context.BridgeController.trackUnifiedSwapBridgeEvent,
    ).toHaveBeenCalledWith(
      UnifiedSwapBridgeEventName.FiatCryptoToggleClicked,
      expect.objectContaining({
        previous_primary_denomination: 'token_amount',
        new_primary_denomination: 'fiat_value',
        token_symbol_source: ETH_SOURCE.symbol,
        token_symbol_destination: USDC_DEST.symbol,
        chain_id_source: 'eip155:1',
        chain_id_destination: 'eip155:1',
        token_address_source: 'eip155:1/slip44:60',
        token_address_destination:
          'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        token_security_type_destination: null,
        swap_type: 'single_chain',
        feature_id: FeatureId.UNIFIED_SWAP_BRIDGE,
      }),
    );
  });

  it('mirrors source fiat mode on the destination amount display', async () => {
    const state = initialStateBridge({ deterministicFiat: true })
      .withBridgeRecommendedQuoteEvmSimple()
      .withOverrides({
        bridge: {
          ...DEFAULT_BRIDGE,
          sourceAmount: '1',
          selectedDestChainId: '0x1',
        },
        engine: {
          backgroundState: {
            BridgeController: {
              inputPrimaryDenomination: 'fiat_value',
            },
            TokenRatesController: {
              marketData: {
                '0x1': {
                  [USDC_DEST.address]: {
                    tokenAddress: USDC_DEST.address,
                    currency: 'ETH',
                    price: 0.0005,
                  },
                },
              },
            },
          },
        },
      } as unknown as DeepPartial<RootState>)
      .build();
    const bridgeControllerState = (
      (state as unknown as DeepPartial<RootState>).engine?.backgroundState as
        | Record<string, unknown>
        | undefined
    )?.BridgeController as
      | {
          recommendedQuote: Record<string, unknown>;
          quotes: Record<string, unknown>[];
        }
      | undefined;
    const recommendedQuote = bridgeControllerState?.recommendedQuote;
    const quoteWithTrade = merge({}, recommendedQuote, {
      quote: {
        aggregator: 'test-bridge',
        protocols: ['test-bridge'],
        steps: [],
      },
      trade: {
        value: '0xde0b6b3a7640000',
        gasLimit: 0,
        effectiveGas: 0,
      },
    });

    if (bridgeControllerState) {
      bridgeControllerState.recommendedQuote = quoteWithTrade;
      bridgeControllerState.quotes = [quoteWithTrade];
    }

    const { getByTestId, getByText } = renderComponentViewScreen(
      BridgeView as unknown as React.ComponentType,
      { name: Routes.BRIDGE.BRIDGE_VIEW },
      { state },
    );

    await waitFor(() => {
      expect(
        getByTestId(BridgeViewSelectorsIDs.DESTINATION_TOKEN_INPUT).props.value,
      ).toBe('$1.00');
    });
    expect(getByText('1 USDC')).toBeOnTheScreen();
  });

  it('resets source cursor to the end when input is focused again', async () => {
    const { getByTestId, getByText, findByDisplayValue } =
      defaultBridgeWithTokens({
        bridge: {
          sourceAmount: '1234',
          sourceToken: ETH_SOURCE,
          destToken: undefined,
        },
      } as unknown as Record<string, unknown>);
    const sourceInput = getByTestId(BridgeViewSelectorsIDs.SOURCE_TOKEN_INPUT);

    fireEvent(sourceInput, 'selectionChange', {
      nativeEvent: { selection: { start: 1, end: 1 } },
    });
    fireEvent(sourceInput, 'blur');
    fireEvent(sourceInput, 'focus');

    expect(sourceInput.props.selection).toEqual({ start: 5, end: 5 });

    await waitFor(() => {
      expect(
        getByTestId(BuildQuoteSelectors.KEYPAD_DELETE_BUTTON),
      ).toBeOnTheScreen();
    });
    fireEvent.press(getByText('9'));

    expect(await findByDisplayValue('12,349')).toBeOnTheScreen();
  });

  it('shows zero secondary value when source amount is empty', async () => {
    const { findByText } = defaultBridgeWithTokens({
      bridge: {
        sourceAmount: undefined,
        sourceToken: ETH_SOURCE,
        destToken: undefined,
      },
      engine: {
        backgroundState: {
          BridgeController: {
            inputPrimaryDenomination: 'fiat_value',
          },
        },
      },
    } as unknown as Record<string, unknown>);

    expect(await findByText('0 ETH')).toBeOnTheScreen();
  });

  it('floors the fiat-mode secondary token amount to the shared Bridge precision', async () => {
    const { findByText, queryByText } = defaultBridgeWithTokens({
      bridge: {
        sourceAmount: '0.054266763023182519',
        sourceToken: ETH_SOURCE,
        destToken: undefined,
      },
      engine: {
        backgroundState: {
          BridgeController: {
            inputPrimaryDenomination: 'fiat_value',
          },
        },
      },
    } as unknown as Record<string, unknown>);

    expect(await findByText('0.05426 ETH')).toBeOnTheScreen();
    expect(queryByText('0.05427 ETH')).toBeNull();
    expect(queryByText('0.054266763023182519 ETH')).toBeNull();
  });

  it('keeps quote requests based on token amount after fiat input', async () => {
    const updateQuoteSpy = jest.spyOn(
      Engine.context.BridgeController,
      'updateBridgeQuoteRequestParams',
    );
    const { getByTestId, getByText, findByDisplayValue, findByText, store } =
      defaultBridgeWithTokens({
        bridge: {
          sourceAmount: '0',
          sourceToken: ETH_SOURCE,
          destToken: USDC_DEST,
          selectedDestChainId: '0x1',
        },
        engine: {
          backgroundState: {
            BridgeController: {
              quotes: [],
              recommendedQuote: null,
              quotesLastFetched: 0,
              quotesLoadingStatus: null,
              quoteFetchError: null,
              inputPrimaryDenomination: 'fiat_value',
            },
          },
        },
      } as unknown as Record<string, unknown>);

    updateQuoteSpy.mockClear();
    fireEvent(
      getByTestId(BridgeViewSelectorsIDs.SOURCE_TOKEN_INPUT),
      'pressIn',
    );

    await waitFor(() => {
      expect(
        getByTestId(BuildQuoteSelectors.KEYPAD_DELETE_BUTTON),
      ).toBeOnTheScreen();
    });

    fireEvent.press(getByText('5'));
    fireEvent.press(getByText('0'));

    expect(await findByDisplayValue('50')).toBeOnTheScreen();
    expect(await findByText('0.025 ETH')).toBeOnTheScreen();

    await waitFor(() => {
      expect(store.getState().bridge.sourceAmount).toBe('0.025');
    });
    await waitFor(
      () => {
        expect(updateQuoteSpy).toHaveBeenCalledWith(
          expect.objectContaining({
            srcTokenAmount: '25000000000000000',
          }),
          expect.anything(),
          expect.anything(),
          expect.anything(),
        );
      },
      { timeout: 1000 },
    );

    updateQuoteSpy.mockRestore();
  });

  it('uses token input without resetting persisted fiat mode when price data is unavailable', async () => {
    jest.clearAllMocks();
    const sourceTokenWithoutPrice = {
      ...ETH_SOURCE,
      address: '0x1234567890123456789012345678901234567890',
      symbol: 'NOPE',
    };
    const { getByTestId, queryByTestId, queryByText, findByDisplayValue } =
      renderBridgeView({
        overrides: {
          bridge: {
            ...DEFAULT_BRIDGE,
            sourceAmount: '1',
            sourceToken: sourceTokenWithoutPrice,
            destToken: undefined,
          },
          engine: {
            backgroundState: {
              BridgeController: {
                inputPrimaryDenomination: 'fiat_value',
              },
              CurrencyRateController: {
                currentCurrency: 'USD',
                currencyRates: {},
                conversionRate: 0,
              },
              TokenRatesController: {
                marketData: {},
              },
            },
          },
        } as unknown as DeepPartial<RootState>,
      });

    fireEvent(
      getByTestId(BridgeViewSelectorsIDs.SOURCE_TOKEN_INPUT),
      'pressIn',
    );

    expect(
      queryByTestId(BridgeViewSelectorsIDs.SOURCE_AMOUNT_TYPE_TOGGLE),
    ).toBeNull();
    expect(queryByText('$0.00')).toBeNull();
    expect(
      Engine.context.BridgeController.setInputPrimaryDenomination,
    ).not.toHaveBeenCalledWith('token_amount');
    expect(await findByDisplayValue('1')).toBeOnTheScreen();
  });

  it('renders enabled confirm button with tokens, amount and recommended quote', () => {
    const now = Date.now();
    const { getAllByTestId } = defaultBridgeWithTokens({
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
            quotesLoadingStatus: RequestStatus.FETCHED,
            quoteFetchError: null,
          },
        },
      },
    } as unknown as Record<string, unknown>);

    // The confirm button may render in both the bottom content area and inside
    // the SwapsKeypad (which stays open until the user taps outside the input).
    const buttons = getAllByTestId(BridgeViewSelectorsIDs.CONFIRM_BUTTON);
    expect(buttons.length).toBeGreaterThanOrEqual(1);
    expect(buttons[0]).toBeOnTheScreen();
    expect(
      (buttons[0] as unknown as { props: { isDisabled?: boolean } }).props
        .isDisabled,
    ).not.toBe(true);
  });

  it('stores custom slippage when user sets 5%', async () => {
    const { store } = defaultBridgeWithTokens({
      bridge: { selectedDestChainId: '0x1' },
      engine: {
        backgroundState: {
          BridgeController: {
            quotesLastFetched: 0,
            quotes: [],
            quotesLoadingStatus: null,
            quoteFetchError: null,
          },
        },
      },
    } as unknown as Record<string, unknown>);

    act(() => {
      store.dispatch(setSlippage('5'));
    });

    await waitFor(
      () => {
        expect(store.getState().bridge.slippage).toBe('5');
      },
      { timeout: 1000 },
    );
  });

  it('navigates to dest token selector on press', async () => {
    const TokenSelectorProbe: React.FC<{
      route?: { params?: { type?: string } };
    }> = (props) => (
      <Text testID="token-selector-probe">{props?.route?.params?.type}</Text>
    );
    const state = initialStateBridge()
      .withOverrides({
        bridge: { sourceToken: ETH_SOURCE },
      } as unknown as Record<string, unknown>)
      .build() as unknown as Record<string, unknown>;
    const { findByText } = renderScreenWithRoutes(
      BridgeView as unknown as React.ComponentType,
      { name: Routes.BRIDGE.ROOT },
      [
        {
          name: Routes.BRIDGE.TOKEN_SELECTOR,
          Component:
            TokenSelectorProbe as unknown as React.ComponentType<unknown>,
        },
      ],
      { state },
    );

    fireEvent.press(await findByText('Swap to'));
    expect(await findByText('dest')).toBeOnTheScreen();
  });

  describe('Gasless swap', () => {
    it('shows error banner when gasless swap quote fetch fails', async () => {
      const now = Date.now();

      const { findByText } = defaultBridgeWithTokens({
        engine: {
          backgroundState: {
            BridgeController: {
              quotes: [],
              recommendedQuote: null,
              quotesLastFetched: now,
              quotesLoadingStatus: RequestStatus.FETCHED,
              quoteStreamComplete: {
                hasQuotes: false,
                quoteCount: 0,
                reason: QuoteStreamCompleteReason.RETRY,
              },
            },
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                gasFeesSponsoredNetwork: { '0x1': true },
              },
            },
          },
        },
      } as unknown as Record<string, unknown>);

      expect(
        await findByText(strings('bridge.quote_stream_complete_retry')),
      ).toBeOnTheScreen();
    });
  });

  describe('Off-hours trading banner', () => {
    it('shows the warning when dest stock is in off-hours and hides it after switching dest', async () => {
      const nowMs = Date.now();
      const stockInRegularHours = createStockRwaToken({
        nowMs,
        inRegularHours: true,
        inOffHours: false,
      });
      const stockInOffHours = createStockRwaToken({
        nowMs,
        inRegularHours: false,
        inOffHours: true,
      });
      const { queryByTestId, findByTestId, findByText, store } =
        defaultBridgeWithTokens({
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  [RWA_FEATURE_FLAG_NAME]: true,
                },
              },
            },
          },
        });

      act(() => {
        store.dispatch(setDestToken(stockInRegularHours));
      });

      await waitFor(() => {
        expect(store.getState().bridge.destToken?.symbol).toBe('AAPL');
      });
      expect(
        queryByTestId(BridgeViewSelectorsIDs.OFF_HOURS_TRADING_BANNER),
      ).not.toBeOnTheScreen();

      act(() => {
        store.dispatch(setDestToken(stockInOffHours));
      });

      expect(
        await findByTestId(BridgeViewSelectorsIDs.OFF_HOURS_TRADING_BANNER),
      ).toBeOnTheScreen();
      expect(
        await findByText(strings('bridge.off_hours_trading.title')),
      ).toBeOnTheScreen();
      expect(
        await findByText(strings('bridge.off_hours_trading.description')),
      ).toBeOnTheScreen();

      act(() => {
        store.dispatch(setDestToken(USDC_DEST as BridgeToken));
      });

      await waitFor(() => {
        expect(
          queryByTestId(BridgeViewSelectorsIDs.OFF_HOURS_TRADING_BANNER),
        ).not.toBeOnTheScreen();
      });
    });

    it('replaces the off-hours warning with the market-closed banner when dest stock becomes fully closed', async () => {
      const nowMs = Date.now();
      const stockInOffHours = createStockRwaToken({
        nowMs,
        inRegularHours: false,
        inOffHours: true,
      });
      const stockFullyClosed = createStockRwaToken({
        nowMs,
        inRegularHours: false,
        inOffHours: false,
      });
      const { queryByTestId, findByTestId, store } = defaultBridgeWithTokens({
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                [RWA_FEATURE_FLAG_NAME]: true,
              },
            },
          },
        },
      });

      act(() => {
        store.dispatch(setDestToken(stockInOffHours));
      });

      expect(
        await findByTestId(BridgeViewSelectorsIDs.OFF_HOURS_TRADING_BANNER),
      ).toBeOnTheScreen();
      expect(
        queryByTestId(BridgeViewSelectorsIDs.MARKET_CLOSED_BANNER),
      ).not.toBeOnTheScreen();

      act(() => {
        store.dispatch(setDestToken(stockFullyClosed));
      });

      expect(
        await findByTestId(BridgeViewSelectorsIDs.MARKET_CLOSED_BANNER),
      ).toBeOnTheScreen();
      expect(
        queryByTestId(BridgeViewSelectorsIDs.OFF_HOURS_TRADING_BANNER),
      ).not.toBeOnTheScreen();
    });

    it('hides the market-unavailable quote error when the dest stock market is fully closed', async () => {
      const nowMs = Date.now();
      const stockFullyClosed = createStockRwaToken({
        nowMs,
        inRegularHours: false,
        inOffHours: false,
      });

      const { queryByTestId, findByTestId } = defaultBridgeWithTokens({
        bridge: {
          destToken: stockFullyClosed,
          sourceAmount: '1',
        },
        engine: {
          backgroundState: {
            BridgeController: {
              quotes: [],
              recommendedQuote: null,
              quotesLastFetched: nowMs,
              quotesLoadingStatus: RequestStatus.FETCHED,
              quoteStreamComplete: {
                hasQuotes: false,
                quoteCount: 0,
                reason: QuoteStreamCompleteReason.RWA_MARKET_UNAVAILABLE,
              },
            },
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                [RWA_FEATURE_FLAG_NAME]: true,
              },
            },
          },
        },
      });

      expect(
        await findByTestId(BridgeViewSelectorsIDs.MARKET_CLOSED_BANNER),
      ).toBeOnTheScreen();
      expect(
        queryByTestId(BridgeViewSelectorsIDs.NO_QUOTES_BANNER),
      ).not.toBeOnTheScreen();
    });
  });

  describe('Swap team regression (bug matrix team-swaps-and-bridge)', () => {
    /** Issues covered: #24744, #24865, #24802, #25256 */
    // eslint-disable-next-line @metamask/design-tokens/color-no-hex -- "#24744" style references are GitHub issue IDs (e.g. "#2342"), not color literals
    it('displays gas included label and enables confirm when quote has gas included (#24744)', async () => {
      const now = Date.now();
      const quoteWithGasIncluded = {
        ...(mockQuoteWithMetadata as unknown as Record<string, unknown>),
      };
      const innerQuote =
        (quoteWithGasIncluded.quote as Record<string, unknown>) ?? {};
      quoteWithGasIncluded.quote = {
        ...innerQuote,
        gasIncluded: true,
        srcChainId: 1,
        destChainId: 1,
      };

      const { getByTestId, findByText } = defaultBridgeWithTokens({
        engine: {
          backgroundState: {
            BridgeController: {
              quotes: [quoteWithGasIncluded],
              recommendedQuote: quoteWithGasIncluded,
              quotesLastFetched: now,
              quotesLoadingStatus: RequestStatus.FETCHED,
              quoteFetchError: null,
            },
          },
        },
      } as unknown as Record<string, unknown>);

      expect(await findByText(strings('bridge.included'))).toBeOnTheScreen();

      const confirmButton = getByTestId(BridgeViewSelectorsIDs.CONFIRM_BUTTON);
      expect(confirmButton).toBeOnTheScreen();
      expect(
        (confirmButton as unknown as { props: { isDisabled?: boolean } }).props
          .isDisabled,
      ).not.toBe(true);
    });

    // Regression for #25256: two USDT tokens on Linea must both appear in search results.
    // eslint-disable-next-line @metamask/design-tokens/color-no-hex -- "#25256" style references are GitHub issue IDs (e.g. "#2342"), not color literals
    it('shows two USDT when search API returns two USDT on Linea (#25256)', async () => {
      jest
        .spyOn(Engine.context.AuthenticationController, 'getBearerToken')
        .mockResolvedValue('mock-bearer-token');

      const LINEA_CHAIN_ID = 59144;
      const verifiedUsdtAddress = '0xA219439258ca9da29E9Cc4cE5596924745e12B93';
      const otherUsdtAddress = '0x0000000000000000000000000000000000000001';

      const twoLineaUsdtTokens = [
        {
          assetId: `eip155:${LINEA_CHAIN_ID}/erc20:${verifiedUsdtAddress}`,
          decimals: 6,
          iconUrl: '',
          name: 'Tether USD',
          symbol: 'USDT',
        },
        {
          assetId: `eip155:${LINEA_CHAIN_ID}/erc20:${otherUsdtAddress}`,
          decimals: 6,
          iconUrl: '',
          name: 'Tether USD (duplicate)',
          symbol: 'USDT',
        },
      ];

      const searchResponse = {
        data: twoLineaUsdtTokens,
        count: 2,
        totalCount: 2,
        pageInfo: { hasNextPage: false },
      };

      const fetchSpy = jest
        .spyOn(globalThis, 'fetch')
        .mockImplementation((url, init) => {
          const urlStr =
            typeof url === 'string' ? url : (url as URL).toString();
          if (urlStr.includes('/getTokens/search')) {
            let body: { query?: string } = {};
            try {
              const rawBody = (init as RequestInit)?.body;
              body = typeof rawBody === 'string' ? JSON.parse(rawBody) : {};
            } catch {
              // ignore parse errors
            }
            if (body.query === 'USDT') {
              return Promise.resolve({
                ok: true,
                json: () => Promise.resolve(searchResponse),
              } as Response);
            }
            return Promise.resolve({
              ok: true,
              json: () =>
                Promise.resolve({
                  data: [],
                  count: 0,
                  totalCount: 0,
                  pageInfo: { hasNextPage: false },
                }),
            } as Response);
          }
          if (urlStr.includes('/getTokens/popular')) {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve([]),
            } as Response);
          }
          return Promise.reject(new Error(`Unmocked fetch: ${urlStr}`));
        });

      const state = initialStateBridge({ deterministicFiat: true })
        .withMinimalTokensController(['0x1', '0xe708'])
        .withOverrides({
          bridge: {
            sourceToken: ETH_SOURCE,
          },
          engine: {
            backgroundState: {
              RemoteFeatureFlagController: {
                remoteFeatureFlags: {
                  bridgeConfigV2: {
                    minimumVersion: '0.0.0',
                    maxRefreshCount: 5,
                    refreshRate: 30000,
                    support: true,
                    chains: {},
                    chainRanking: [
                      { chainId: 'eip155:1', name: 'Ethereum' },
                      { chainId: 'eip155:59144', name: 'Linea' },
                    ],
                  },
                },
              },
              NetworkController: {
                networkConfigurationsByChainId: {
                  '0xe708': {
                    chainId: '0xe708',
                    rpcEndpoints: [
                      {
                        networkClientId: 'linea-mainnet',
                        url: 'https://rpc.linea.build',
                        type: 'rpc',
                        name: 'Linea',
                      },
                    ],
                    defaultRpcEndpointIndex: 0,
                    blockExplorerUrls: ['https://lineascan.build'],
                    defaultBlockExplorerUrlIndex: 0,
                    name: 'Linea Mainnet',
                    nativeCurrency: 'ETH',
                  },
                },
              },
              TokenBalancesController: {
                tokenBalances: {},
              },
              PreferencesController: {
                tokenSortConfig: {
                  key: 'tokenFiatAmount',
                  order: 'dsc',
                },
              },
            },
          },
        } as unknown as Record<string, unknown>)
        .build() as unknown as Record<string, unknown>;

      const { getByTestId, getByText, findByText, getAllByText } =
        renderScreenWithRoutes(
          BridgeView as unknown as React.ComponentType,
          { name: Routes.BRIDGE.BRIDGE_VIEW },
          [
            {
              name: Routes.BRIDGE.TOKEN_SELECTOR,
              Component:
                BridgeTokenSelector as unknown as React.ComponentType<unknown>,
            },
          ],
          { state },
        );

      fireEvent.press(await findByText('Swap to'));

      const searchInput = await waitFor(
        () => getByTestId('bridge-token-search-input'),
        { timeout: 5000 },
      );
      fireEvent.changeText(searchInput, 'USDT');

      // Force immediate re-search by changing network with an active query.
      // BridgeTokenSelector calls `searchTokens(searchString)` on chain switch.
      fireEvent.press(getByText('Linea'));

      // Wait for list to show results (second token has unique name)
      await waitFor(
        () => {
          expect(getByText('Tether USD (duplicate)')).toBeOnTheScreen();
        },
        { timeout: 10000 },
      );

      const usdtLabels = getAllByText('USDT');
      expect(usdtLabels.length).toBe(2);

      fetchSpy.mockRestore();
    }, 25000);

    // eslint-disable-next-line @metamask/design-tokens/color-no-hex -- "#24865" style references are GitHub issue IDs (e.g. "#2342"), not color literals
    it('shows native token in source area when source is native token from token details (#24865)', () => {
      const bnbChainId = '0x38';
      const nativeBnbAddress = '0x0000000000000000000000000000000000000000';

      const { getByTestId } = defaultBridgeWithTokens({
        bridge: {
          sourceAmount: '1',
          sourceToken: {
            address: nativeBnbAddress,
            chainId: bnbChainId,
            decimals: 18,
            symbol: 'BNB',
            name: 'BNB',
          },
          destToken: undefined,
        },
      } as unknown as Record<string, unknown>);

      const sourceArea = getByTestId(BridgeViewSelectorsIDs.SOURCE_TOKEN_AREA);
      const destArea = getByTestId(
        BridgeViewSelectorsIDs.DESTINATION_TOKEN_AREA,
      );
      expect(sourceArea).toBeOnTheScreen();
      expect(destArea).toBeOnTheScreen();
      expect(within(sourceArea).getByText('BNB')).toBeOnTheScreen();
    });

    // eslint-disable-next-line @metamask/design-tokens/color-no-hex -- "#24802" style references are GitHub issue IDs (e.g. "#2342"), not color literals
    it('renders USDC to BNB swap setup without crash and hides confirm when no quote (#24802)', () => {
      const bnbChainIdHex = '0x38';

      const { getByTestId, queryByTestId } = defaultBridgeWithTokens({
        bridge: {
          sourceAmount: '100',
          sourceToken: USDC_DEST,
          destToken: undefined,
          selectedDestChainId: bnbChainIdHex,
        },
        engine: {
          backgroundState: {
            BridgeController: {
              quotes: [],
              recommendedQuote: null,
              quotesLastFetched: 0,
              quotesLoadingStatus: null,
              quoteFetchError: null,
            },
          },
        },
      } as unknown as Record<string, unknown>);

      expect(
        getByTestId(BridgeViewSelectorsIDs.SOURCE_TOKEN_AREA),
      ).toBeOnTheScreen();
      expect(
        getByTestId(BridgeViewSelectorsIDs.DESTINATION_TOKEN_AREA),
      ).toBeOnTheScreen();
      expect(queryByTestId(BridgeViewSelectorsIDs.CONFIRM_BUTTON)).toBeNull();
    });
  });

  // Migrated from tests/smoke/swap/swap-deeplink-smoke.spec.ts
  describe('Deeplink navigation', () => {
    // E2E: 'navigate to bridge view with full parameters (USDC to USDT)'
    it('renders USDC source and USDT destination when opened with full deeplink params', async () => {
      const { findByTestId, getByTestId } = defaultBridgeWithTokens({
        bridge: {
          sourceToken: USDC_DEST,
          destToken: USDT_DEST,
          sourceAmount: '1',
        },
      } as unknown as Record<string, unknown>);

      const sourceArea = await findByTestId(
        BridgeViewSelectorsIDs.SOURCE_TOKEN_AREA,
      );
      const destArea = getByTestId(
        BridgeViewSelectorsIDs.DESTINATION_TOKEN_AREA,
      );

      expect(within(sourceArea).getByText('USDC')).toBeOnTheScreen();
      expect(within(destArea).getByText('USDT')).toBeOnTheScreen();
    });

    // E2E: 'navigate to bridge view with no parameters' + 'handle invalid deep link parameters gracefully'
    // Both cases (no params and invalid params) are discarded by the deeplink handler before
    // navigation, leaving the bridge Redux slice with no tokens set. At the component level
    // the rendering is identical, so a single test covers both E2E scenarios.
    it('renders source token area with no confirm button when no valid deeplink params are provided', async () => {
      const { findByTestId, queryByTestId } = renderBridgeView({
        overrides: {
          bridge: { sourceToken: undefined, destToken: undefined },
        } as unknown as DeepPartial<RootState>,
      });

      expect(
        await findByTestId(BridgeViewSelectorsIDs.SOURCE_TOKEN_AREA),
      ).toBeOnTheScreen();
      expect(queryByTestId(BridgeViewSelectorsIDs.CONFIRM_BUTTON)).toBeNull();
    });
  });

  // Migrated from tests/smoke/swap/swap-trending-tokens.spec.ts
  // E2E: 'zero-state trending supports filters then row navigation'
  describe('Trending tokens zero state', () => {
    beforeEach(() => {
      setupTrendingApiFetchMock(mockTrendingTokensData);
    });

    afterEach(() => {
      clearTrendingApiMocks();
    });

    it('shows trending section with filters, opens price filter bottom sheet, and hides when amount is entered', async () => {
      const { findByTestId, getByTestId, queryByTestId, store } =
        renderBridgeView({
          overrides: {
            bridge: { sourceToken: ETH_SOURCE },
            engine: {
              backgroundState: {
                RemoteFeatureFlagController: {
                  remoteFeatureFlags: {
                    [SWAP_DISCOVERY_FEED_REVAMP_AB_KEY]: 'control',
                  },
                  cacheTimestamp: 0,
                },
              },
            },
          } as unknown as DeepPartial<RootState>,
        });

      await findByTestId(BridgeTrendingTokensSectionTestIds.SECTION);
      expect(
        getByTestId(BridgeTrendingTokensSectionTestIds.PRICE_FILTER),
      ).toBeOnTheScreen();
      expect(
        getByTestId(BridgeTrendingTokensSectionTestIds.NETWORK_FILTER),
      ).toBeOnTheScreen();
      expect(
        getByTestId(BridgeTrendingTokensSectionTestIds.TIME_FILTER),
      ).toBeOnTheScreen();

      await waitFor(
        () => {
          expect(
            getByTestId(
              getTrendingTokenRowItemTestId(
                'eip155:1/erc20:0x0000000000000000000000000000000000000000',
              ),
            ),
          ).toBeOnTheScreen();
        },
        { timeout: 5000 },
      );

      fireEvent.press(
        getByTestId(BridgeTrendingTokensSectionTestIds.PRICE_FILTER),
      );
      expect(
        await findByTestId(TrendingTokensBottomSheetTestIds.PRICE_CHANGE),
      ).toBeOnTheScreen();

      act(() => {
        store.dispatch(setSourceAmount('1'));
      });
      await waitFor(() => {
        expect(
          queryByTestId(BridgeTrendingTokensSectionTestIds.SECTION),
        ).not.toBeOnTheScreen();
      });
    });
  });
});
