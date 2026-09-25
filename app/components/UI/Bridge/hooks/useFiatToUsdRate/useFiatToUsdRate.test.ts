import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { initialState, ethChainId } from '../../_mocks_/initialState';
import { useFiatToUsdRate } from '.';

const NATIVE_ETH_ASSET_ID = 'eip155:1/slip44:60';

/**
 * Builds state where 1 ETH is worth `price` in the display currency and
 * `usdPrice` in USD, which is the pair of rates the conversion is derived from.
 */
const createState = ({
  selectedCurrency,
  price = 2000,
  usdPrice,
}: {
  selectedCurrency: 'usd' | 'eur';
  price?: number;
  usdPrice?: number;
}) => ({
  ...initialState,
  engine: {
    ...initialState.engine,
    backgroundState: {
      ...initialState.engine.backgroundState,
      AssetsController: {
        ...initialState.engine.backgroundState.AssetsController,
        selectedCurrency,
        assetsPrice: {
          [NATIVE_ETH_ASSET_ID]: {
            assetPriceType: 'fungible' as const,
            id: 'eth',
            price,
            usdPrice,
            lastUpdated: 1700000000000,
          },
        },
      },
    },
  },
});

const renderFiatToUsdRate = (
  state: ReturnType<typeof createState>,
  chainId?: string,
) =>
  renderHookWithProvider(() => useFiatToUsdRate(chainId), {
    state,
  }).result.current;

describe('useFiatToUsdRate', () => {
  it('returns 1 when the display currency is already USD', () => {
    // No usable rate, to prove USD needs none for the conversion to be exact.
    const state = createState({ selectedCurrency: 'usd' });

    const rate = renderFiatToUsdRate(state, ethChainId);

    expect(rate).toBe(1);
  });

  it('returns the USD value of one unit of the display currency', () => {
    // 1 ETH is worth EUR 2000 and USD 2160, so EUR 1 is worth USD 1.08.
    const state = createState({
      selectedCurrency: 'eur',
      price: 2000,
      usdPrice: 2160,
    });

    const rate = renderFiatToUsdRate(state, ethChainId);

    expect(rate).toBe(1.08);
  });

  it('falls back to another native currency rate for a chain that has none', () => {
    const state = createState({
      selectedCurrency: 'eur',
      price: 2000,
      usdPrice: 2160,
    });

    const rate = renderFiatToUsdRate(state, 'eip155:1234');

    expect(rate).toBe(1.08);
  });

  it('returns undefined when no currency rate prices the display currency', () => {
    const state = createState({ selectedCurrency: 'eur' });

    const rate = renderFiatToUsdRate(state, ethChainId);

    expect(rate).toBeUndefined();
  });
});
