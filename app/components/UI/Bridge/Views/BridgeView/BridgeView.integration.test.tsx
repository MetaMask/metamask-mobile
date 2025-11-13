import '../../../../../util/test/integration/mocks';
import { initialState as BridgeMocksInitial } from '../../_mocks_/initialState';
import { mockQuoteWithMetadata } from '../../_mocks_/bridgeQuoteWithMetadata';
import { renderBridgeView } from '../../../../../util/test/integration/renderers/bridge';
import { fireEvent, waitFor, within } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import React from 'react';
import { Text } from 'react-native';
import { renderIntegrationScreenWithRoutes } from '../../../../../util/test/integration/render';
import Routes from '../../../../../constants/navigation/Routes';
import { initialStateBridge } from '../../../../../util/test/integration/presets/bridge';
import BridgeView from './index';

describe('BridgeView (integration)', () => {
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
    expect(getByTestId('source-token-area')).toBeTruthy();
    expect(getByTestId('dest-token-area-input')).toBeTruthy();

    // Confirm button should NOT be rendered without valid inputs and quote
    expect(queryByTestId('bridge-confirm-button')).toBeNull();
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
    const closeBanner = queryByTestId('banner-close-button-icon');
    if (closeBanner) {
      fireEvent.press(closeBanner);
    }

    // Ensure keypad is visible
    await waitFor(() => {
      expect(queryByTestId('keypad-delete-button')).toBeTruthy();
    });

    // Type 9.5 using keypad buttons
    const scroll = getByTestId('bridge-view-scroll');
    fireEvent.press(within(scroll).getByText('9'));
    fireEvent.press(within(scroll).getByText('.'));
    fireEvent.press(within(scroll).getByText('5'));

    // Assert amount and exact fiat conversion (9.5 * $2000 = $19,000.00)
    expect(await findByDisplayValue('9.5')).toBeTruthy();
    await waitFor(async () => {
      expect(await findByText('$19,000.00')).toBeTruthy();
    });
  });

  it('renders enabled confirm button with tokens, amount and recommended quote', () => {
    const bridgeBg = (
      BridgeMocksInitial.engine as unknown as {
        backgroundState: Record<string, unknown>;
      }
    ).backgroundState;
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
            ...bridgeBg,
            RemoteFeatureFlagController: bridgeBg.RemoteFeatureFlagController,
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
      } as unknown as Record<string, unknown>,
    });

    const button = getByTestId('bridge-confirm-button');
    expect(button).toBeTruthy();
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
    expect(await findByText(expected)).toBeTruthy();
  });

  it('navigates to dest token selector on press', async () => {
    const ModalRootProbe: React.FC<{
      route?: { params?: { screen?: string } };
    }> = (props) => (
      // eslint-disable-next-line react-native/no-raw-text
      <Text testID="modal-root-probe">{props?.route?.params?.screen}</Text>
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
    const { findByText } = renderIntegrationScreenWithRoutes(
      // Component
      BridgeView as unknown as React.ComponentType,
      // Entry route
      { name: Routes.BRIDGE.ROOT },
      // Register modal root to probe destination screen name
      [{ name: Routes.BRIDGE.MODALS.ROOT, Component: ModalRootProbe }],
      // State
      { state },
    );

    fireEvent.press(await findByText('Swap to'));
    expect(
      await findByText(Routes.BRIDGE.MODALS.DEST_NETWORK_SELECTOR),
    ).toBeTruthy();
  });
});
