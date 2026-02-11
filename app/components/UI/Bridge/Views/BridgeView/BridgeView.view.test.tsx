import '../../../../../util/test/component-view/mocks';
import { mockQuoteWithMetadata } from '../../_mocks_/bridgeQuoteWithMetadata';
import { renderBridgeView } from '../../../../../util/test/component-view/renderers/bridge';
import { act, fireEvent, waitFor, within } from '@testing-library/react-native';
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
import Engine from '../../../../../core/Engine';
import { DEBOUNCE_WAIT } from '../../hooks/useBridgeQuoteRequest';
import { setSlippage } from '../../../../../core/redux/slices/bridge';
import { BridgeTokenSelector } from '../../components/BridgeTokenSelector/BridgeTokenSelector';

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
    const {
      getByTestId,
      getByText,
      queryByTestId,
      findByText,
      findByDisplayValue,
    } = renderBridgeView({
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

    // Type 9.5 using keypad buttons (keypad is now rendered via SwapsKeypad BottomSheet outside ScrollView)
    fireEvent.press(getByText('9'));
    fireEvent.press(getByText('.'));
    fireEvent.press(getByText('5'));

    // Assert amount and exact fiat conversion (9.5 * $2000 = $19,000.00)
    expect(await findByDisplayValue('9.5')).toBeOnTheScreen();
    expect(await findByText('$19,000.00')).toBeOnTheScreen();
  });

  it('renders enabled confirm button with tokens, amount and recommended quote', () => {
    const now = Date.now();
    const { getAllByTestId } = renderBridgeView({
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

  it('calls quote API with custom slippage when user has set 5% and quote is requested', () => {
    jest.useFakeTimers();

    const updateQuoteSpy = jest.spyOn(
      Engine.context.BridgeController,
      'updateBridgeQuoteRequestParams',
    );

    const { store } = renderBridgeView({
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
          selectedDestChainId: '0x1',
        },
        engine: {
          backgroundState: {
            BridgeController: {
              quotesLastFetched: 0,
              quotes: [],
              quotesLoadingStatus: 'IDLE',
              quoteFetchError: null,
            },
          },
        },
      } as unknown as Record<string, unknown>,
    });

    jest.advanceTimersByTime(DEBOUNCE_WAIT);
    updateQuoteSpy.mockClear();

    act(() => {
      store.dispatch(setSlippage('5'));
    });
    act(() => {
      jest.advanceTimersByTime(DEBOUNCE_WAIT);
    });

    expect(updateQuoteSpy).toHaveBeenCalledWith(
      expect.objectContaining({ slippage: 5 }),
      expect.anything(),
    );

    updateQuoteSpy.mockRestore();
    jest.useRealTimers();
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

  it('shows confirm button when refreshing quote with previous active quote', () => {
    const now = Date.now();
    const previousQuote = { ...mockQuoteWithMetadata };

    const { getAllByTestId } = renderBridgeView({
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

    // Confirm button should be visible when there is an active quote during refresh.
    // The button may appear in both the bottom content area and inside the
    // SwapsKeypad (which stays open until the user taps outside the input).
    const buttons = getAllByTestId(BridgeViewSelectorsIDs.CONFIRM_BUTTON);
    expect(buttons.length).toBeGreaterThanOrEqual(1);
    expect(buttons[0]).toBeOnTheScreen();
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

  describe('Swap team regression (bug matrix team-swaps-and-bridge)', () => {
    // Bugs from docs/bug-test-matrix/metamask-mobile-bugs-last-30-days.md (team-swaps-and-bridge).
    // Covered here: #24744, #24865, #24802, #25256. #25787 was service-side (fee API), not Bridge. Others need Wallet/other views or E2E.
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

      const { getByTestId, findByText } = renderBridgeView({
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
                quotes: [quoteWithGasIncluded],
                recommendedQuote: quoteWithGasIncluded,
                quotesLastFetched: now,
                quotesLoadingStatus: 'SUCCEEDED',
                quoteFetchError: null,
              },
            },
          },
        } as unknown as Record<string, unknown>,
      });

      expect(await findByText(strings('bridge.included'))).toBeOnTheScreen();

      const confirmButton = getByTestId(BridgeViewSelectorsIDs.CONFIRM_BUTTON);
      expect(confirmButton).toBeOnTheScreen();
      expect(
        (confirmButton as unknown as { props: { isDisabled?: boolean } }).props
          .isDisabled,
      ).not.toBe(true);
    });

    it('shows two USDT when search API returns two USDT on Linea (#25256)', async () => {
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
            const body =
              typeof (init as RequestInit)?.body === 'string'
                ? JSON.parse((init as RequestInit).body as string)
                : {};
            if (body.query === 'USDT') {
              return Promise.resolve({
                ok: true,
                json: () => Promise.resolve(searchResponse),
              } as Response);
            }
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
            sourceToken: {
              address: '0x0000000000000000000000000000000000000000',
              chainId: '0x1',
              decimals: 18,
              symbol: 'ETH',
              name: 'Ether',
            },
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

      const { getByTestId, findByText, getAllByText } = renderScreenWithRoutes(
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
        { timeout: 3000 },
      );
      fireEvent.changeText(searchInput, 'USDT');

      // #25256: API can return two tokens with same symbol on Linea (e.g. verified + unverified).
      // UI shows both; no client-side deduplication. TokensController.allIgnoredTokens
      // (wallet blocklist) is not used by Bridge token selector; if it were, we could add
      // a case with one token in allIgnoredTokens expecting 1 result.
      await waitFor(
        () => {
          const usdtLabels = getAllByText('USDT');
          expect(usdtLabels.length).toBe(2);
        },
        { timeout: 4000 },
      );

      fetchSpy.mockRestore();
    });

    it('shows native token in source area when source is native token from token details (#24865)', () => {
      const bnbChainId = '0x38';
      const nativeBnbAddress = '0x0000000000000000000000000000000000000000';

      const { getByTestId } = renderBridgeView({
        deterministicFiat: true,
        overrides: {
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
        } as unknown as Record<string, unknown>,
      });

      const sourceArea = getByTestId(BridgeViewSelectorsIDs.SOURCE_TOKEN_AREA);
      const destArea = getByTestId(
        BridgeViewSelectorsIDs.DESTINATION_TOKEN_AREA,
      );
      expect(sourceArea).toBeOnTheScreen();
      expect(destArea).toBeOnTheScreen();
      expect(within(sourceArea).getByText('BNB')).toBeOnTheScreen();
    });

    it('renders USDC to BNB swap setup without crash and hides confirm when no quote (#24802)', () => {
      const usdcAddress = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
      const bnbChainIdHex = '0x38';

      const { getByTestId, queryByTestId } = renderBridgeView({
        deterministicFiat: true,
        overrides: {
          bridge: {
            sourceAmount: '100',
            sourceToken: {
              address: usdcAddress,
              chainId: '0x1',
              decimals: 6,
              symbol: 'USDC',
              name: 'USD Coin',
            },
            destToken: undefined,
            selectedDestChainId: bnbChainIdHex,
          },
          engine: {
            backgroundState: {
              BridgeController: {
                quotes: [],
                recommendedQuote: null,
                quotesLastFetched: 0,
                quotesLoadingStatus: 'IDLE',
                quoteFetchError: null,
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
  });
});
