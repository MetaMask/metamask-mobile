import '../../../../../../tests/component-view/mocks';
import { fireEvent } from '@testing-library/react-native';
import { renderV2TokenSelectionWithRoutes } from '../../../../../../tests/component-view/renderers/ramps';
import Routes from '../../../../../constants/navigation/Routes';
import { TOKEN_LIST_ITEM_TEST_IDS } from '../../components/TokenListItem/TokenListItem.testIds';

const USDC = {
  assetId: 'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  chainId: 'eip155:1',
  name: 'USD Coin',
  symbol: 'USDC',
  decimals: 6,
  tokenSupported: true,
};

const USDT = {
  assetId: 'eip155:1/erc20:0xdAC17F958D2ee523a2206206994597C13D831ec7',
  chainId: 'eip155:1',
  name: 'Tether USD',
  symbol: 'USDT',
  decimals: 6,
  tokenSupported: false,
};

const TOKENS = [USDC, USDT];

function rampsTokenState() {
  return {
    engine: {
      backgroundState: {
        PreferencesController: {
          isIpfsGatewayEnabled: false,
        },
        RampsController: {
          userRegion: {
            country: {
              currency: 'USD',
              isoCode: 'US',
              defaultAmount: 100,
              quickAmounts: [50, 100],
            },
            regionCode: 'us-ca',
          },
          tokens: {
            data: { topTokens: TOKENS, allTokens: TOKENS },
            selected: null,
            isLoading: false,
            error: null,
          },
          providers: {
            data: [],
            selected: null,
            isLoading: false,
            error: null,
          },
          paymentMethods: {
            data: [],
            selected: null,
            isLoading: false,
            error: null,
          },
          orders: [],
        },
      },
    },
  };
}

describe('V2 unified-buy TokenSelection', () => {
  it('selects a token and opens the amount screen for it', async () => {
    const { findByText, getByTestId } = renderV2TokenSelectionWithRoutes({
      overrides: rampsTokenState(),
      wireRampsController: true,
    });

    expect(await findByText('USD Coin')).toBeOnTheScreen();
    fireEvent.press(
      getByTestId(`${TOKEN_LIST_ITEM_TEST_IDS.ITEM_PREFIX}${USDC.assetId}`),
    );

    expect(await findByText('Buy USDC')).toBeOnTheScreen();
    expect(await findByText('on Ethereum Main Network')).toBeOnTheScreen();
  });

  it('opens the unsupported token sheet from the info button', async () => {
    const { findByText, findByTestId, getByTestId } =
      renderV2TokenSelectionWithRoutes({
        overrides: rampsTokenState(),
      });

    expect(await findByText('Tether USD')).toBeOnTheScreen();
    fireEvent.press(
      getByTestId(TOKEN_LIST_ITEM_TEST_IDS.UNSUPPORTED_INFO_BUTTON),
    );

    expect(
      await findByTestId(`route-${Routes.RAMP.MODALS.UNSUPPORTED_TOKEN}`),
    ).toBeOnTheScreen();
  });

  it('shows an empty state when the search matches no token', async () => {
    const { findByText, findByPlaceholderText, getByPlaceholderText } =
      renderV2TokenSelectionWithRoutes({
        overrides: rampsTokenState(),
      });

    expect(await findByText('USD Coin')).toBeOnTheScreen();
    expect(
      await findByPlaceholderText('Search token by name or address'),
    ).toBeOnTheScreen();

    fireEvent.changeText(
      getByPlaceholderText('Search token by name or address'),
      'zzzz-not-a-token',
    );

    expect(
      await findByText('No tokens match "zzzz-not-a-token"'),
    ).toBeOnTheScreen();
  });
});
