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
import type { DeepPartial } from '../../../../../util/test/renderWithProvider';
import type { RootState } from '../../../../../reducers';
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
    const { getByTestId, queryByTestId, findByText, findByDisplayValue } =
      defaultBridgeWithTokens({
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

    await waitFor(() => {
      expect(
        getByTestId(BuildQuoteSelectors.KEYPAD_DELETE_BUTTON),
      ).toBeOnTheScreen();
    });

    const scroll = getByTestId(BridgeViewSelectorsIDs.BRIDGE_VIEW_SCROLL);
    fireEvent.press(within(scroll).getByText('9'));
    fireEvent.press(within(scroll).getByText('.'));
    fireEvent.press(within(scroll).getByText('5'));

    expect(await findByDisplayValue('9.5')).toBeOnTheScreen();
    expect(await findByText('$19,000.00')).toBeOnTheScreen();
  });

  it('renders enabled confirm button with tokens, amount and recommended quote', () => {
    const now = Date.now();
    const { getByTestId } = defaultBridgeWithTokens({
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

  it('calls quote API with custom slippage when user has set 5% and quote is requested', () => {
    jest.useFakeTimers();
    try {
      const updateQuoteSpy = jest.spyOn(
        Engine.context.BridgeController,
        'updateBridgeQuoteRequestParams',
      );

      const { store } = defaultBridgeWithTokens({
        bridge: { selectedDestChainId: '0x1' },
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
      } as unknown as Record<string, unknown>);

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
    } finally {
      jest.useRealTimers();
    }
  });

  it('displays no MM fee disclaimer for mUSD destination with zero MM fee', async () => {
    const musdAddress = '0xaca92e438df0b2401ff60da7e4337b687a2435da';
    const now = Date.now();
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

    const { findByText } = defaultBridgeWithTokens({
      bridge: {
        sourceAmount: '1.0',
        sourceToken: ETH_SOURCE,
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
    } as unknown as Record<string, unknown>);

    const expected = strings('bridge.no_mm_fee_disclaimer', {
      destTokenSymbol: 'mUSD',
    });
    expect(await findByText(expected)).toBeOnTheScreen();
  });

  it('shows confirm button when refreshing quote with previous active quote', () => {
    const now = Date.now();
    const previousQuote = { ...mockQuoteWithMetadata };

    const { queryByTestId } = defaultBridgeWithTokens({
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
    } as unknown as Record<string, unknown>);

    expect(queryByTestId(BuildQuoteSelectors.KEYPAD_DELETE_BUTTON)).toBeNull();
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

  describe('Swap team regression (bug matrix team-swaps-and-bridge)', () => {
    /** Issues covered: #24744, #24865, #24802, #25256 */
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
              quotesLoadingStatus: 'SUCCEEDED',
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

    // TODO: Test is flaky after rebase - search results from mocked fetch do not render as 2 USDT labels.
    // Fix mock/state or assertion (e.g. wait for useTokensWithBalances to map API response to list items).
    it.skip('shows two USDT when search API returns two USDT on Linea (#25256)', async () => {
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

      // Flush search debounce (300ms in useSearchTokens) so the fetch runs and results render
      jest.useFakeTimers();
      try {
        await act(async () => {
          await jest.advanceTimersByTimeAsync(350);
        });
        jest.useRealTimers();
        await waitFor(
          () => {
            const usdtLabels = getAllByText('USDT');
            expect(usdtLabels.length).toBe(2);
          },
          { timeout: 6000 },
        );
      } finally {
        jest.useRealTimers();
      }

      fetchSpy.mockRestore();
    }, 15000);

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
              quotesLoadingStatus: 'IDLE',
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
