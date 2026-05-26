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
import { setSlippage } from '../../../../../core/redux/slices/bridge';
import { BridgeTokenSelector } from '../../components/BridgeTokenSelector/BridgeTokenSelector';
import Engine from '../../../../../core/Engine';
import type { DeepPartial } from '../../../../../util/test/renderWithProvider';
import type { RootState } from '../../../../../reducers';
import {
  RequestStatus,
  QuoteStreamCompleteReason,
} from '@metamask/bridge-controller';
import {
  DEFAULT_BRIDGE,
  ETH_SOURCE,
  USDC_DEST,
} from '../../_mocks_/bridgeViewTestConstants';

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

  it('toggles source input from token amount to fiat value and back', async () => {
    const { getByTestId, findByDisplayValue, findByText } =
      defaultBridgeWithTokens({
        bridge: {
          sourceAmount: '1',
          sourceToken: ETH_SOURCE,
          destToken: undefined,
        },
      } as unknown as Record<string, unknown>);

    fireEvent.press(
      getByTestId(BridgeViewSelectorsIDs.SOURCE_AMOUNT_TYPE_TOGGLE),
    );

    expect(await findByDisplayValue('2,000')).toBeOnTheScreen();
    expect(await findByText('1 ETH')).toBeOnTheScreen();
    expect(
      getByTestId(BridgeViewSelectorsIDs.SOURCE_TOKEN_INPUT).props.selection,
    ).toEqual({ start: 5, end: 5 });

    fireEvent.press(
      getByTestId(BridgeViewSelectorsIDs.SOURCE_AMOUNT_TYPE_TOGGLE),
    );

    expect(await findByDisplayValue('1')).toBeOnTheScreen();
    expect(await findByText('$2,000.00')).toBeOnTheScreen();
    expect(
      getByTestId(BridgeViewSelectorsIDs.SOURCE_TOKEN_INPUT).props.selection,
    ).toEqual({ start: 1, end: 1 });
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
    const quote = recommendedQuote?.quote as Record<string, unknown>;
    const quoteWithTrade = {
      ...recommendedQuote,
      quote: {
        ...quote,
        bridgeId: 'test-bridge',
        bridges: ['test-bridge'],
        steps: [],
      },
      trade: {
        value: '0xde0b6b3a7640000',
        gasLimit: 0,
        effectiveGas: 0,
      },
    };

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
      ).toBe('1');
    });

    fireEvent.press(
      getByTestId(BridgeViewSelectorsIDs.SOURCE_AMOUNT_TYPE_TOGGLE),
    );

    await waitFor(() => {
      expect(
        getByTestId(BridgeViewSelectorsIDs.DESTINATION_TOKEN_INPUT).props.value,
      ).toBe('$1.00');
    });
    expect(getByText('1 USDC')).toBeOnTheScreen();

    fireEvent.press(
      getByTestId(BridgeViewSelectorsIDs.SOURCE_AMOUNT_TYPE_TOGGLE),
    );

    await waitFor(() => {
      expect(
        getByTestId(BridgeViewSelectorsIDs.DESTINATION_TOKEN_INPUT).props.value,
      ).toBe('1');
    });
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
    const { getByTestId, findByText } = defaultBridgeWithTokens({
      bridge: {
        sourceAmount: undefined,
        sourceToken: ETH_SOURCE,
        destToken: undefined,
      },
    } as unknown as Record<string, unknown>);

    expect(await findByText('$0')).toBeOnTheScreen();

    fireEvent.press(
      getByTestId(BridgeViewSelectorsIDs.SOURCE_AMOUNT_TYPE_TOGGLE),
    );

    expect(await findByText('0 ETH')).toBeOnTheScreen();
  });

  it('floors the fiat-mode secondary token amount to the shared Bridge precision', async () => {
    const { getByTestId, findByText, queryByText } = defaultBridgeWithTokens({
      bridge: {
        sourceAmount: '0.054266763023182519',
        sourceToken: ETH_SOURCE,
        destToken: undefined,
      },
    } as unknown as Record<string, unknown>);

    fireEvent.press(
      getByTestId(BridgeViewSelectorsIDs.SOURCE_AMOUNT_TYPE_TOGGLE),
    );

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
            },
          },
        },
      } as unknown as Record<string, unknown>);

    updateQuoteSpy.mockClear();
    fireEvent.press(
      getByTestId(BridgeViewSelectorsIDs.SOURCE_AMOUNT_TYPE_TOGGLE),
    );
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

  it('keeps source input in token mode when price data is unavailable', async () => {
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
});
