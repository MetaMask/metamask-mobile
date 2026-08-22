import { RootState } from '../../reducers';
import { selectAssetsBySelectedAccountGroup } from '../../selectors/assets/assets-list';
import { selectTokenMarketData } from '../../selectors/tokenRatesController';
import { selectMultichainAssetsRates } from '../../selectors/multichain/multichain';
import { buildWidgetPayload, WIDGET_MAX_TOKENS } from './buildWidgetPayload';

jest.mock('../../selectors/assets/assets-list', () => ({
  selectAssetsBySelectedAccountGroup: jest.fn(),
}));

jest.mock('../../selectors/tokenRatesController', () => ({
  selectTokenMarketData: jest.fn(),
}));

jest.mock('../../selectors/multichain/multichain', () => ({
  selectMultichainAssetsRates: jest.fn(),
}));

const mockSelector = selectAssetsBySelectedAccountGroup as jest.MockedFunction<
  typeof selectAssetsBySelectedAccountGroup
>;
const mockMarketData = selectTokenMarketData as jest.MockedFunction<
  typeof selectTokenMarketData
>;
const mockMultichainRates = selectMultichainAssetsRates as jest.MockedFunction<
  typeof selectMultichainAssetsRates
>;

// Minimal asset shape used by the builder.
const makeAsset = (
  symbol: string,
  balance: string,
  fiatBalance: number,
  image = `https://logos/${symbol}.png`,
  assetId = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  chainId = '0x1',
  extra: Record<string, unknown> = {},
) =>
  ({
    symbol,
    balance,
    image,
    assetId,
    chainId,
    fiat: { balance: fiatBalance, currency: 'usd', conversionRate: 1 },
    ...extra,
  }) as unknown as ReturnType<
    typeof selectAssetsBySelectedAccountGroup
  >[string][number];

const state = {} as RootState;

describe('buildWidgetPayload', () => {
  beforeEach(() => {
    // Default: no market data available. Individual tests override as needed.
    mockMarketData.mockReturnValue({});
    mockMultichainRates.mockReturnValue({});
  });

  afterEach(() => jest.clearAllMocks());

  it('includes only tokens whose holding value is over $1', () => {
    mockSelector.mockReturnValue({
      '0x1': [
        makeAsset('USDC', '100', 100), // > $1 included
        makeAsset('DUST', '0.5', 0.5), // < $1 ✗ excluded
      ],
    });

    const { tokens } = buildWidgetPayload(state);

    expect(tokens.map((t) => t.symbol)).toEqual(['USDC']);
  });

  it('computes unit price as holding value / token balance', () => {
    mockSelector.mockReturnValue({
      '0x1': [makeAsset('ETH', '2', 6000)], // unit price $3,000
    });

    const { tokens } = buildWidgetPayload(state);

    expect(tokens[0].priceFormatted.replace(/,/g, '')).toContain('3000');
    expect(tokens[0].priceFormatted).toContain('$');
    expect(tokens[0].logoUrl).toBe('https://logos/ETH.png');
  });

  it('sorts by holding value descending', () => {
    mockSelector.mockReturnValue({
      '0x1': [makeAsset('A', '10', 10)],
      '0x89': [makeAsset('B', '10', 500), makeAsset('C', '10', 50)],
    });

    const { tokens } = buildWidgetPayload(state);

    expect(tokens.map((t) => t.symbol)).toEqual(['B', 'C', 'A']);
  });

  it(`caps the list at ${WIDGET_MAX_TOKENS} tokens`, () => {
    const many = Array.from({ length: WIDGET_MAX_TOKENS + 5 }, (_, i) =>
      makeAsset(`T${i}`, '1', 100 + i),
    );
    mockSelector.mockReturnValue({ '0x1': many });

    const { tokens } = buildWidgetPayload(state);

    expect(tokens).toHaveLength(WIDGET_MAX_TOKENS);
  });

  it('excludes tokens with zero balance even if fiat is set', () => {
    mockSelector.mockReturnValue({
      '0x1': [makeAsset('ZERO', '0', 100)],
    });

    expect(buildWidgetPayload(state).tokens).toHaveLength(0);
  });

  it('returns an empty payload when no tokens qualify', () => {
    mockSelector.mockReturnValue({});

    expect(buildWidgetPayload(state)).toEqual({ tokens: [] });
  });

  it('builds a swap deep link with the CAIP-19 source token', () => {
    mockSelector.mockReturnValue({
      '0x1': [
        makeAsset(
          'USDC',
          '100',
          100,
          'https://logos/USDC.png',
          '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
          '0x1',
        ),
      ],
    });

    const { tokens } = buildWidgetPayload(state);

    expect(tokens[0].deeplink).toBe(
      `metamask://swap?from=${encodeURIComponent(
        'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      )}`,
    );
  });

  describe('24h price change', () => {
    it('reads an EVM token change from market data keyed by [chainId][address]', () => {
      const address = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
      mockSelector.mockReturnValue({
        '0x1': [
          makeAsset('USDC', '100', 100, undefined, address, '0x1', { address }),
        ],
      });
      mockMarketData.mockReturnValue({
        '0x1': { [address]: { pricePercentChange1d: 2.31 } },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      expect(buildWidgetPayload(state).tokens[0].priceChange1d).toBe(2.31);
    });

    it('reads an EVM native token change keyed by the native token address', () => {
      // getNativeTokenAddress(chainId) → the zero address.
      const nativeAddress = '0x0000000000000000000000000000000000000000';
      mockSelector.mockReturnValue({
        '0x1': [
          makeAsset('ETH', '2', 6000, undefined, '0x0', '0x1', {
            isNative: true,
          }),
        ],
      });
      mockMarketData.mockReturnValue({
        '0x1': { [nativeAddress]: { pricePercentChange1d: -1.5 } },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      expect(buildWidgetPayload(state).tokens[0].priceChange1d).toBe(-1.5);
    });

    it('reads a non-EVM change from the multichain rates controller', () => {
      const caipAssetId = 'solana:101/token:abc';
      mockSelector.mockReturnValue({
        'solana:101': [
          makeAsset('SOL', '5', 500, undefined, caipAssetId, 'solana:101'),
        ],
      });
      mockMultichainRates.mockReturnValue({
        [caipAssetId]: { marketData: { pricePercentChange: { P1D: 4.2 } } },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      expect(buildWidgetPayload(state).tokens[0].priceChange1d).toBe(4.2);
    });

    it('leaves priceChange1d undefined when no rate is available', () => {
      mockSelector.mockReturnValue({ '0x1': [makeAsset('USDC', '100', 100)] });

      expect(buildWidgetPayload(state).tokens[0].priceChange1d).toBeUndefined();
    });
  });

  describe('sparkline', () => {
    it('attaches a sparkline series to each token', () => {
      mockSelector.mockReturnValue({ '0x1': [makeAsset('USDC', '100', 100)] });

      const sparkline = buildWidgetPayload(state).tokens[0].sparkline;
      expect(Array.isArray(sparkline)).toBe(true);
      expect((sparkline as number[]).length).toBeGreaterThan(1);
    });

    it('is deterministic for a given symbol across calls (keeps payload dedup stable)', () => {
      mockSelector.mockReturnValue({ '0x1': [makeAsset('USDC', '100', 100)] });

      const first = buildWidgetPayload(state).tokens[0].sparkline;
      const second = buildWidgetPayload(state).tokens[0].sparkline;
      expect(first).toEqual(second);
    });
  });
});
