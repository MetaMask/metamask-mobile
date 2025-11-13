import '../../../../../util/test/integration/mocks';
import { initialState as BridgeMocksInitial } from '../../_mocks_/initialState';
import { mockQuoteWithMetadata } from '../../_mocks_/bridgeQuoteWithMetadata';
import { renderBridgeView } from '../../../../../util/test/integration/renderers/bridge';
import { fireEvent, waitFor, within } from '@testing-library/react-native';

describe('BridgeView (integration - basic, no quotes)', () => {
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
      } as unknown as Record<string, unknown>,
    });

    const button = getByTestId('bridge-confirm-button');
    expect(button).toBeTruthy();
    expect(
      (button as unknown as { props: { isDisabled?: boolean } }).props
        .isDisabled,
    ).not.toBe(true);
  });
});
