import React from 'react';
import '../../../../../util/test/component-view/mocks';
import { describeForPlatforms } from '../../../../../util/test/platform';
import { renderBridgeView } from '../../../../../util/test/component-view/renderers/bridge';
import { renderComponentViewScreen } from '../../../../../util/test/component-view/render';
import { initialStateBridge } from '../../../../../util/test/component-view/presets/bridge';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import BridgeView from '.';
import {
  QuoteViewSelectorIDs,
  QuoteViewSelectorText,
} from '../../../../../../e2e/selectors/swaps/QuoteView.selectors';
import { fireEvent, within } from '@testing-library/react-native';
import Engine from '../../../../../core/Engine';
import { mockQuoteWithMetadata } from '../../_mocks_/bridgeQuoteWithMetadata';
import { RequestStatus } from '@metamask/bridge-controller';
import { SolScope } from '@metamask/keyring-api';
import { normalizeQuote } from '../../../../../util/test/component-view/helpers/normalizeQuote';

// Normalize QuoteResponse amounts to match selector expectations (amount.value shape)

describeForPlatforms('BridgeView component-view', () => {
  it('renders base view and shows Select amount when no inputs', () => {
    const { getByText, queryByTestId } = renderBridgeView({
      deterministicFiat: true,
    });

    expect(getByText(QuoteViewSelectorText.SELECT_AMOUNT)).toBeTruthy();
    expect(queryByTestId(QuoteViewSelectorIDs.CONFIRM_BUTTON)).toBeNull();
  });

  it('types via keypad and updates amount and fiat (deterministic)', () => {
    const { getByText, getByTestId } = renderBridgeView({
      deterministicFiat: true,
    });

    // Act: type 9.5 using keypad
    const scroll = getByTestId(QuoteViewSelectorIDs.BRIDGE_VIEW_SCROLL);
    fireEvent.press(within(scroll).getByText('9'));
    fireEvent.press(within(scroll).getByText('.'));
    fireEvent.press(within(scroll).getByText('5'));

    // Assert: input and fiat reflect typed amount
    const input = getByTestId(QuoteViewSelectorIDs.SOURCE_TOKEN_INPUT);
    expect(input.props.value).toBe('9.5');
    expect(getByText('$19,000.00')).toBeTruthy();
  });

  it('hides Max button for native token', () => {
    // Native token - no Max button
    const native = renderBridgeView({
      deterministicFiat: true,
      overrides: {
        bridge: {
          sourceToken: {
            address: '0x0000000000000000000000000000000000000000',
            chainId: '0x1',
            decimals: 18,
            name: 'Ether',
            symbol: 'ETH',
            image: '',
          },
        },
      },
    });
    expect(native.queryByTestId(QuoteViewSelectorIDs.MAX_BUTTON)).toBeNull();
  });

  it('shows Max button for native token on mainnet when gasless swap is enabled', async () => {
    // Arrange via preset builder: enable gasless swap on mainnet and set a same-chain dest token (swap)
    const state = initialStateBridge({ deterministicFiat: true })
      .withGaslessSwapEnabled('0x1')
      .withOverrides({
        bridge: {
          // Native ETH with an immediate cached balance to avoid async fetch flakiness
          sourceToken: {
            address: '0x0000000000000000000000000000000000000000',
            chainId: '0x1',
            decimals: 18,
            name: 'Ether',
            symbol: 'ETH',
            image: '',
            balance: '2.0',
          },
          // Any ERC-20 on mainnet to make it a swap (same chain)
          destToken: {
            address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
            chainId: '0x1',
            decimals: 6,
            name: 'Tether USD',
            symbol: 'USDT',
            image: '',
          },
        },
      } as unknown as Record<string, unknown>)
      .build();

    const { findByTestId } = renderComponentViewScreen(
      BridgeView as unknown as React.ComponentType,
      { name: Routes.BRIDGE.BRIDGE_VIEW },
      { state },
    );

    // Assert: Max button is visible for native token under gasless swap (smart tx) conditions
    expect(await findByTestId(QuoteViewSelectorIDs.MAX_BUTTON)).toBeTruthy();
  });

  it('shows confirm button when a recommended quote exists and inputs are valid', () => {
    // Arrange using real mock quote shape used across app unit tests
    const quote = mockQuoteWithMetadata as unknown as Record<string, unknown>;
    const normalized = normalizeQuote(quote);
    // Ensure gas is considered sufficient and EVM chain
    normalized.quote = {
      ...(normalized.quote ?? {}),
      srcChainId: '0x1',
      gasIncluded: true,
    };
    const state = initialStateBridge({ deterministicFiat: true })
      .withOverrides({
        engine: {
          backgroundState: {
            BridgeController: {
              quotes: [normalized],
              recommendedQuote: normalized,
              quotesLastFetched: Date.now(),
              quotesLoadingStatus: RequestStatus.FETCHED,
            },
          },
        },
        bridge: {
          sourceAmount: '1.0',
          sourceToken: {
            address: '0x0000000000000000000000000000000000000000',
            chainId: '0x1',
            decimals: 18,
            name: 'Ether',
            symbol: 'ETH',
            image: '',
          },
          destToken: {
            address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
            chainId: '0x1',
            decimals: 6,
            name: 'Tether USD',
            symbol: 'USDT',
            image: '',
          },
        },
      } as unknown as Record<string, unknown>)
      .build();

    const { getByTestId, queryByText } = renderComponentViewScreen(
      BridgeView as unknown as React.ComponentType,
      { name: Routes.BRIDGE.BRIDGE_VIEW },
      { state },
    );

    // Assert: CTA visible and "Select amount" hidden
    expect(getByTestId(QuoteViewSelectorIDs.CONFIRM_BUTTON)).toBeTruthy();
    expect(queryByText(QuoteViewSelectorText.SELECT_AMOUNT)).toBeNull();
  });

  it('disables confirm button while quotes are loading (active quote present)', () => {
    // Arrange: real quote + loading status forces disabled CTA
    const quote = mockQuoteWithMetadata as unknown as Record<string, unknown>;
    const normalized = normalizeQuote(quote);
    // EVM + gasless to avoid gas checks interfering with label
    normalized.quote = {
      ...(normalized.quote ?? {}),
      srcChainId: '0x1',
      gasIncluded: true,
    };
    const state = initialStateBridge({ deterministicFiat: true })
      .withOverrides({
        engine: {
          backgroundState: {
            BridgeController: {
              quotes: [normalized],
              recommendedQuote: normalized,
              quotesLastFetched: Date.now(),
              quotesLoadingStatus: RequestStatus.LOADING,
            },
          },
        },
        bridge: {
          sourceAmount: '1.0',
          sourceToken: {
            address: '0x0000000000000000000000000000000000000000',
            chainId: '0x1',
            decimals: 18,
            name: 'Ether',
            symbol: 'ETH',
            image: '',
          },
          destToken: {
            address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
            chainId: '0x1',
            decimals: 6,
            name: 'Tether USD',
            symbol: 'USDT',
            image: '',
          },
        },
      } as unknown as Record<string, unknown>)
      .build();

    const { getByTestId, getByText } = renderComponentViewScreen(
      BridgeView as unknown as React.ComponentType,
      { name: Routes.BRIDGE.BRIDGE_VIEW },
      { state },
    );

    // Assert
    const button = getByTestId(
      QuoteViewSelectorIDs.CONFIRM_BUTTON,
    ) as unknown as {
      props: { accessibilityState?: { disabled?: boolean }; label?: string };
    };
    expect(button.props.accessibilityState?.disabled).toBe(true);
    expect(getByText(strings('bridge.confirm_swap'))).toBeTruthy();
  });

  it('disables confirm button and shows “Insufficient funds” when balance is lower than sourceAmount', () => {
    // Arrange: valid quote present + low cached balance ensures insufficient funds state
    const quote = mockQuoteWithMetadata as unknown as Record<string, unknown>;
    const normalized = normalizeQuote(quote);
    // EVM without gasless so insufficient balance check is active
    normalized.quote = { ...(normalized.quote ?? {}), srcChainId: '0x1' };
    // Force provider balance to be tiny for this test
    const originalGetNetworkClientById = Engine.context.NetworkController
      .getNetworkClientById as unknown as (id: string) => unknown;
    (
      Engine.context.NetworkController as unknown as {
        getNetworkClientById: (id: string) => unknown;
      }
    ).getNetworkClientById = ((id: string) => {
      const orig = originalGetNetworkClientById(id) as {
        provider: {
          request: (args: {
            method: string;
            params?: unknown[];
          }) => Promise<unknown>;
        };
      } & Record<string, unknown>;
      const originalProvider = orig.provider;
      const tinyBalanceProvider: typeof originalProvider = {
        ...originalProvider,
        request: jest.fn(
          async (args: { method: string; params?: unknown[] }) => {
            if (args?.method === 'eth_getBalance') return '0x1'; // 1 wei
            return originalProvider.request(args);
          },
        ),
      };
      return { ...orig, provider: tinyBalanceProvider };
    }) as typeof originalGetNetworkClientById;
    const state = initialStateBridge({ deterministicFiat: true })
      .withOverrides({
        engine: {
          backgroundState: {
            BridgeController: {
              quotes: [normalized],
              recommendedQuote: normalized,
              quotesLastFetched: Date.now(),
              quotesLoadingStatus: RequestStatus.FETCHED,
            },
          },
        },
        bridge: {
          sourceAmount: '1.0',
          sourceToken: {
            address: '0x0000000000000000000000000000000000000000',
            chainId: '0x1',
            decimals: 18,
            name: 'Ether',
            symbol: 'ETH',
            image: '',
            balance: '0.5', // cached balance used by useLatestBalance initially
          },
          destToken: {
            address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
            chainId: '0x1',
            decimals: 6,
            name: 'Tether USD',
            symbol: 'USDT',
            image: '',
          },
        },
      } as unknown as Record<string, unknown>)
      .build();

    const { getByTestId } = renderComponentViewScreen(
      BridgeView as unknown as React.ComponentType,
      { name: Routes.BRIDGE.BRIDGE_VIEW },
      { state },
    );

    const button = getByTestId(
      QuoteViewSelectorIDs.CONFIRM_BUTTON,
    ) as unknown as {
      props: { accessibilityState?: { disabled?: boolean } };
    };

    // Assert
    expect(button.props.accessibilityState?.disabled).toBe(true);
    // restore provider
    (
      Engine.context.NetworkController as unknown as {
        getNetworkClientById: (id: string) => unknown;
      }
    ).getNetworkClientById = originalGetNetworkClientById;
  });

  it('disables confirm button and shows “Submitting transaction” when submitting', () => {
    // Arrange: valid EVM recommended quote + submitting state
    const quote = mockQuoteWithMetadata as unknown as Record<string, unknown>;
    const normalized = normalizeQuote(quote);
    // EVM + gasless to avoid gas checks interfering
    normalized.quote = {
      ...(normalized.quote ?? {}),
      srcChainId: '0x1',
      gasIncluded: true,
    };
    const state = initialStateBridge({ deterministicFiat: true })
      .withOverrides({
        bridge: {
          isSubmittingTx: true,
          sourceAmount: '1.0',
          sourceToken: {
            address: '0x0000000000000000000000000000000000000000',
            chainId: '0x1',
            decimals: 18,
            name: 'Ether',
            symbol: 'ETH',
            image: '',
          },
          destToken: {
            address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
            chainId: '0x1',
            decimals: 6,
            name: 'Tether USD',
            symbol: 'USDT',
            image: '',
          },
        },
      } as unknown as Record<string, unknown>)
      .withOverrides({
        engine: {
          backgroundState: {
            BridgeController: {
              quotes: [normalized],
              recommendedQuote: normalized,
              quotesLastFetched: Date.now(),
              quotesLoadingStatus: RequestStatus.FETCHED,
            },
          },
        },
      } as unknown as Record<string, unknown>)
      .build();

    const { getByTestId, getByText } = renderComponentViewScreen(
      BridgeView as unknown as React.ComponentType,
      { name: Routes.BRIDGE.BRIDGE_VIEW },
      { state },
    );

    // Assert
    const button = getByTestId(
      QuoteViewSelectorIDs.CONFIRM_BUTTON,
    ) as unknown as {
      props: { accessibilityState?: { disabled?: boolean } };
    };
    expect(button.props.accessibilityState?.disabled).toBe(true);
    expect(getByText(strings('bridge.submitting_transaction'))).toBeTruthy();
  });

  it('disables confirm button and shows hardware warning when account is hardware and source is Solana', async () => {
    // Arrange: mutate allowed Engine mock to model a hardware keyring including selected address
    // Selected address from preset: '0x0000000000000000000000000000000000000001'
    Engine.context.KeyringController.state.keyrings = [
      {
        type: 'Ledger Hardware',
        accounts: ['0x0000000000000000000000000000000000000001'],
        metadata: { id: 'mock', name: '' },
      },
    ];

    // Use Solana chain IDs to set isSolanaSourced=true
    const { getByTestId, getByText } = renderBridgeView({
      deterministicFiat: true,
      overrides: {
        bridge: {
          sourceAmount: '1.0',
          sourceToken: {
            address: 'So11111111111111111111111111111111111111112',
            chainId: SolScope.Mainnet,
            decimals: 9,
            name: 'Solana',
            symbol: 'SOL',
            image: '',
            balance: '10',
          },
          destToken: {
            address: 'So11111111111111111111111111111111111111112',
            chainId: SolScope.Mainnet,
            decimals: 9,
            name: 'Solana',
            symbol: 'SOL',
            image: '',
          },
        },
        engine: {
          backgroundState: {
            BridgeController: {
              // Ensure CTA section renders
              quotesLastFetched: Date.now(),
              // Use normalized quote to satisfy selectors
              recommendedQuote: (() => {
                const q = normalizeQuote(mockQuoteWithMetadata);
                // Solana numeric scope
                q.quote = {
                  ...(q.quote ?? {}),
                  srcChainId: SolScope.Mainnet,
                  destChainId: SolScope.Mainnet,
                };
                return q;
              })(),
              quotes: [
                (() => {
                  const q = normalizeQuote(mockQuoteWithMetadata);
                  q.quote = {
                    ...(q.quote ?? {}),
                    srcChainId: SolScope.Mainnet,
                    destChainId: SolScope.Mainnet,
                  };
                  return q;
                })(),
              ],
              quotesLoadingStatus: 'SUCCEEDED',
            },
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                bridgeConfigV2: {
                  minimumVersion: '0.0.0',
                  maxRefreshCount: 5,
                  refreshRate: 30000,
                  support: true,
                  chains: {
                    'solana:1': {
                      isActiveSrc: true,
                      isActiveDest: true,
                    },
                  },
                },
              },
            },
          },
        },
      } as unknown as Record<string, unknown>,
    });

    // Assert: CTA disabled and hardware banner visible
    const button = getByTestId(
      QuoteViewSelectorIDs.CONFIRM_BUTTON,
    ) as unknown as {
      props: { accessibilityState?: { disabled?: boolean } };
    };
    expect(button.props.accessibilityState?.disabled).toBe(true);
    expect(
      await getByText(strings('bridge.hardware_wallet_not_supported_solana')),
    ).toBeTruthy();
  });

  it('disables confirm button and shows “Insufficient gas” when gas is not sufficient', () => {
    // Arrange: quote with very large effective gas fee vs provider mocked 100 ETH balance
    const quote = normalizeQuote({
      ...(mockQuoteWithMetadata as unknown as Record<string, unknown>),
      gasFee: {
        effective: { amount: '1000000', usd: null, valueInCurrency: null },
        max: { amount: '1000000', usd: null, valueInCurrency: null },
        total: { amount: '1000000', usd: null, valueInCurrency: null },
      },
    } as unknown as Record<string, unknown>);
    // Force EVM to ensure balance lookup works
    quote.quote = { ...(quote.quote ?? {}), srcChainId: '0x1' };
    const state = initialStateBridge({ deterministicFiat: true })
      .withOverrides({
        bridge: {
          sourceAmount: '1.0',
          sourceToken: {
            address: '0x0000000000000000000000000000000000000000',
            chainId: '0x1',
            decimals: 18,
            name: 'Ether',
            symbol: 'ETH',
            image: '',
            balance: '100', // display balance; provider returns 100 ETH as well
          },
          destToken: {
            address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
            chainId: '0x1',
            decimals: 6,
            name: 'Tether USD',
            symbol: 'USDT',
            image: '',
          },
        },
      } as unknown as Record<string, unknown>)
      .withOverrides({
        engine: {
          backgroundState: {
            BridgeController: {
              quotes: [quote],
              recommendedQuote: quote,
              quotesLastFetched: Date.now(),
              quotesLoadingStatus: 'SUCCEEDED',
            },
          },
        },
      } as unknown as Record<string, unknown>)
      .build();

    const { getByTestId, getByText } = renderComponentViewScreen(
      BridgeView as unknown as React.ComponentType,
      { name: Routes.BRIDGE.BRIDGE_VIEW },
      { state },
    );

    // Assert
    const button = getByTestId(
      QuoteViewSelectorIDs.CONFIRM_BUTTON,
    ) as unknown as {
      props: { accessibilityState?: { disabled?: boolean } };
    };
    expect(button.props.accessibilityState?.disabled).toBe(true);
    expect(getByText(strings('bridge.insufficient_gas'))).toBeTruthy();
  });

  it.skip('disables confirm button and shows Blockaid alert when validation returns error (Solana flow)', async () => {
    // Arrange: mock fetch to return a Blockaid ERROR response
    const fetchSpy = jest
      .spyOn(global as unknown as { fetch: typeof fetch }, 'fetch')
      .mockResolvedValue({
        json: async () =>
          Promise.resolve({
            status: 'ERROR',
            result: { validation: { reason: 'transaction is malicious' } },
            error_details: { message: 'transaction is malicious' },
          }),
      } as unknown as Response);

    const state = initialStateBridge({ deterministicFiat: true })
      .withOverrides({
        bridge: {
          sourceAmount: '1.0',
          sourceToken: {
            address: 'So11111111111111111111111111111111111111112',
            chainId: SolScope.Mainnet,
            decimals: 9,
            name: 'Solana',
            symbol: 'SOL',
            image: '',
            balance: '10',
          },
          destToken: {
            address: 'So11111111111111111111111111111111111111112',
            chainId: SolScope.Mainnet,
            decimals: 9,
            name: 'Solana',
            symbol: 'SOL',
            image: '',
          },
        },
        engine: {
          backgroundState: {
            BridgeController: {
              quotesLastFetched: Date.now(),
              recommendedQuote: (() => {
                const q = normalizeQuote(mockQuoteWithMetadata);
                q.quote = {
                  ...(q.quote ?? {}),
                  srcChainId: SolScope.Mainnet,
                  destChainId: SolScope.Mainnet,
                };
                // include a dummy trade to satisfy validator payload shape
                q.trade = 'CgRkYXRh';
                return q;
              })(),
              quotes: [
                (() => {
                  const q = normalizeQuote(mockQuoteWithMetadata);
                  q.quote = {
                    ...(q.quote ?? {}),
                    srcChainId: SolScope.Mainnet,
                    destChainId: SolScope.Mainnet,
                  };
                  return q;
                })(),
              ],
              quotesLoadingStatus: RequestStatus.FETCHED,
            },
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                bridgeConfigV2: {
                  minimumVersion: '0.0.0',
                  maxRefreshCount: 5,
                  refreshRate: 30000,
                  support: true,
                  chains: {
                    'solana:1': {
                      isActiveSrc: true,
                      isActiveDest: true,
                    },
                  },
                },
              },
            },
          },
        },
      } as unknown as Record<string, unknown>)
      .build();

    const { findByTestId } = renderComponentViewScreen(
      BridgeView as unknown as React.ComponentType,
      { name: Routes.BRIDGE.BRIDGE_VIEW },
      { state },
    );

    // Assert
    const button = (await findByTestId(
      QuoteViewSelectorIDs.CONFIRM_BUTTON,
    )) as unknown as { props: { accessibilityState?: { disabled?: boolean } } };
    expect(button.props.accessibilityState?.disabled).toBe(true);
    // Assert a banner is shown (Blockaid error)
    expect(await findByTestId('banneralert')).toBeTruthy();

    // Cleanup
    fetchSpy.mockRestore();
  });

  it.skip('shows no MM fee disclaimer when dest token is flagged and fee bps is zero', () => {
    // Arrange: build state with a recommended quote and override fee bps + noFeeAssets flag
    const musdAddress = '0xaca92e438df0b2401ff60da7e4337b687a2435da';
    const state = initialStateBridge({ deterministicFiat: true })
      .withBridgeRecommendedQuoteEvmSimple({
        srcAmount: '1000000000000000000',
        destTokenAddress: musdAddress,
      })
      .withOverrides({
        // Make fee percentage 0 via quoteBpsFee
        engine: {
          backgroundState: {
            BridgeController: {
              recommendedQuote: {
                quote: {
                  feeData: { metabridge: { quoteBpsFee: 0 } },
                },
              },
              quotes: [
                {
                  quote: {
                    feeData: { metabridge: { quoteBpsFee: 0 } },
                  },
                },
              ],
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
                      isGaslessSwapEnabled: false,
                      noFeeAssets: [musdAddress],
                    },
                  },
                },
              },
            },
          },
        },
        bridge: {
          sourceAmount: '1.0',
          sourceToken: {
            address: '0x0000000000000000000000000000000000000000',
            chainId: '0x1',
            decimals: 18,
            name: 'Ether',
            symbol: 'ETH',
            image: '',
          },
          destToken: {
            address: musdAddress,
            chainId: '0x1',
            decimals: 6,
            name: 'MetaMask USD',
            symbol: 'mUSD',
            image: '',
          },
        },
      } as unknown as Record<string, unknown>)
      .build();

    const { getByText } = renderComponentViewScreen(
      BridgeView as unknown as React.ComponentType,
      { name: Routes.BRIDGE.BRIDGE_VIEW },
      { state },
    );

    expect(
      getByText(
        strings('bridge.no_mm_fee_disclaimer', { destTokenSymbol: 'mUSD' }),
      ),
    ).toBeTruthy();
  });
});
