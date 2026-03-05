import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { useDisplayCurrencyValue } from './index';
import { getDisplayCurrencyValue } from '../../utils/exchange-rates';
import { selectTokenMarketData } from '../../../../../selectors/tokenRatesController';
import {
  selectCurrencyRates,
  selectCurrentCurrency,
} from '../../../../../selectors/currencyRateController';
import { selectNetworkConfigurations } from '../../../../../selectors/networkController';
import { selectMultichainAssetsRates } from '../../../../../selectors/multichain';
import { BridgeToken } from '../../types';
import { CHAIN_IDS } from '@metamask/transaction-controller';

jest.mock('../../utils/exchange-rates');
jest.mock('../../../../../selectors/tokenRatesController');
jest.mock('../../../../../selectors/currencyRateController');
jest.mock('../../../../../selectors/networkController');
jest.mock('../../../../../selectors/multichain', () => ({
  selectMultichainAssetsRates: jest.fn(),
}));

const mockGetDisplayCurrencyValue =
  getDisplayCurrencyValue as jest.MockedFunction<
    typeof getDisplayCurrencyValue
  >;
const mockSelectTokenMarketData = selectTokenMarketData as jest.MockedFunction<
  typeof selectTokenMarketData
>;
const mockSelectCurrencyRates = selectCurrencyRates as jest.MockedFunction<
  typeof selectCurrencyRates
>;
const mockSelectCurrentCurrency = selectCurrentCurrency as jest.MockedFunction<
  typeof selectCurrentCurrency
>;
const mockSelectNetworkConfigurations =
  selectNetworkConfigurations as jest.MockedFunction<
    typeof selectNetworkConfigurations
  >;
const mockSelectMultichainAssetsRates =
  selectMultichainAssetsRates as jest.MockedFunction<
    typeof selectMultichainAssetsRates
  >;

const MOCK_MARKET_DATA = {
  '0x1': { '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': { price: 1 } },
} as ReturnType<typeof selectTokenMarketData>;

const MOCK_CURRENCY_RATES = {
  ETH: { conversionRate: 2500, usdConversionRate: 2500 },
} as unknown as ReturnType<typeof selectCurrencyRates>;

const MOCK_NETWORK_CONFIGS = {
  '0x1': { nativeCurrency: 'ETH' },
} as unknown as ReturnType<typeof selectNetworkConfigurations>;

const MOCK_MULTICHAIN_RATES = {} as ReturnType<
  typeof selectMultichainAssetsRates
>;

const makeToken = (overrides?: Partial<BridgeToken>): BridgeToken => ({
  address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  symbol: 'USDC',
  decimals: 6,
  chainId: CHAIN_IDS.MAINNET,
  ...overrides,
});

describe('useDisplayCurrencyValue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectTokenMarketData.mockReturnValue(MOCK_MARKET_DATA);
    mockSelectCurrencyRates.mockReturnValue(MOCK_CURRENCY_RATES);
    mockSelectCurrentCurrency.mockReturnValue('USD');
    mockSelectNetworkConfigurations.mockReturnValue(MOCK_NETWORK_CONFIGS);
    mockSelectMultichainAssetsRates.mockReturnValue(MOCK_MULTICHAIN_RATES);
    mockGetDisplayCurrencyValue.mockReturnValue('$0.00');
  });

  describe('return value', () => {
    it('returns the value from getDisplayCurrencyValue', () => {
      // Arrange
      mockGetDisplayCurrencyValue.mockReturnValue('$100.00');
      const token = makeToken();

      // Act
      const { result } = renderHookWithProvider(
        () => useDisplayCurrencyValue('100', token),
        { state: {} },
      );

      // Assert
      expect(result.current).toBe('$100.00');
    });

    it('returns "$0.00" when amount is undefined', () => {
      // Arrange
      mockGetDisplayCurrencyValue.mockReturnValue('$0.00');

      // Act
      const { result } = renderHookWithProvider(
        () => useDisplayCurrencyValue(undefined, makeToken()),
        { state: {} },
      );

      // Assert
      expect(result.current).toBe('$0.00');
    });

    it('returns "$0.00" when token is undefined', () => {
      // Arrange
      mockGetDisplayCurrencyValue.mockReturnValue('$0.00');

      // Act
      const { result } = renderHookWithProvider(
        () => useDisplayCurrencyValue('100', undefined),
        { state: {} },
      );

      // Assert
      expect(result.current).toBe('$0.00');
    });

    it('returns "$0.00" when both amount and token are undefined', () => {
      // Arrange
      mockGetDisplayCurrencyValue.mockReturnValue('$0.00');

      // Act
      const { result } = renderHookWithProvider(
        () => useDisplayCurrencyValue(undefined, undefined),
        { state: {} },
      );

      // Assert
      expect(result.current).toBe('$0.00');
    });
  });

  describe('selector forwarding', () => {
    it('forwards amount and token to getDisplayCurrencyValue', () => {
      // Arrange
      const token = makeToken();

      // Act
      renderHookWithProvider(() => useDisplayCurrencyValue('50', token), {
        state: {},
      });

      // Assert
      expect(mockGetDisplayCurrencyValue).toHaveBeenCalledWith(
        expect.objectContaining({ amount: '50', token }),
      );
    });

    it('forwards evmMultiChainMarketData from selectTokenMarketData', () => {
      // Arrange
      const customMarketData = {
        '0x1': { '0xabc': { price: 2.5 } },
      } as unknown as ReturnType<typeof selectTokenMarketData>;
      mockSelectTokenMarketData.mockReturnValue(customMarketData);

      // Act
      renderHookWithProvider(() => useDisplayCurrencyValue('1', makeToken()), {
        state: {},
      });

      // Assert
      expect(mockGetDisplayCurrencyValue).toHaveBeenCalledWith(
        expect.objectContaining({ evmMultiChainMarketData: customMarketData }),
      );
    });

    it('forwards evmMultiChainCurrencyRates from selectCurrencyRates', () => {
      // Arrange
      const customRates = {
        ETH: { conversionRate: 3000, usdConversionRate: 3000 },
      } as unknown as ReturnType<typeof selectCurrencyRates>;
      mockSelectCurrencyRates.mockReturnValue(customRates);

      // Act
      renderHookWithProvider(() => useDisplayCurrencyValue('1', makeToken()), {
        state: {},
      });

      // Assert
      expect(mockGetDisplayCurrencyValue).toHaveBeenCalledWith(
        expect.objectContaining({
          evmMultiChainCurrencyRates: customRates,
        }),
      );
    });

    it('forwards networkConfigurationsByChainId from selectNetworkConfigurations', () => {
      // Arrange
      const customNetworks = {
        '0x89': { nativeCurrency: 'POL' },
      } as unknown as ReturnType<typeof selectNetworkConfigurations>;
      mockSelectNetworkConfigurations.mockReturnValue(customNetworks);

      // Act
      renderHookWithProvider(() => useDisplayCurrencyValue('1', makeToken()), {
        state: {},
      });

      // Assert
      expect(mockGetDisplayCurrencyValue).toHaveBeenCalledWith(
        expect.objectContaining({
          networkConfigurationsByChainId: customNetworks,
        }),
      );
    });

    it('forwards currentCurrency from selectCurrentCurrency', () => {
      // Arrange
      mockSelectCurrentCurrency.mockReturnValue('EUR');

      // Act
      renderHookWithProvider(() => useDisplayCurrencyValue('1', makeToken()), {
        state: {},
      });

      // Assert
      expect(mockGetDisplayCurrencyValue).toHaveBeenCalledWith(
        expect.objectContaining({ currentCurrency: 'EUR' }),
      );
    });

    it('forwards nonEvmMultichainAssetRates from selectMultichainAssetsRates', () => {
      // Arrange
      const customMultichainRates = {
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501': { rate: '150' },
      } as unknown as ReturnType<typeof selectMultichainAssetsRates>;
      mockSelectMultichainAssetsRates.mockReturnValue(customMultichainRates);

      // Act
      renderHookWithProvider(() => useDisplayCurrencyValue('1', makeToken()), {
        state: {},
      });

      // Assert
      expect(mockGetDisplayCurrencyValue).toHaveBeenCalledWith(
        expect.objectContaining({
          nonEvmMultichainAssetRates: customMultichainRates,
        }),
      );
    });
  });

  describe('different currencies', () => {
    it('returns EUR-formatted value when current currency is EUR', () => {
      // Arrange
      mockSelectCurrentCurrency.mockReturnValue('EUR');
      mockGetDisplayCurrencyValue.mockReturnValue('€42.00');

      // Act
      const { result } = renderHookWithProvider(
        () => useDisplayCurrencyValue('42', makeToken()),
        { state: {} },
      );

      // Assert
      expect(result.current).toBe('€42.00');
      expect(mockGetDisplayCurrencyValue).toHaveBeenCalledWith(
        expect.objectContaining({ currentCurrency: 'EUR' }),
      );
    });

    it('returns GBP-formatted value when current currency is GBP', () => {
      // Arrange
      mockSelectCurrentCurrency.mockReturnValue('GBP');
      mockGetDisplayCurrencyValue.mockReturnValue('£10.50');

      // Act
      const { result } = renderHookWithProvider(
        () => useDisplayCurrencyValue('10', makeToken()),
        { state: {} },
      );

      // Assert
      expect(result.current).toBe('£10.50');
    });

    it('returns small-value threshold string', () => {
      // Arrange
      mockGetDisplayCurrencyValue.mockReturnValue('< $0.01');

      // Act
      const { result } = renderHookWithProvider(
        () => useDisplayCurrencyValue('0.000001', makeToken()),
        { state: {} },
      );

      // Assert
      expect(result.current).toBe('< $0.01');
    });
  });

  describe('non-EVM token', () => {
    it('forwards a non-EVM token to getDisplayCurrencyValue', () => {
      // Arrange
      const solanaToken = makeToken({
        chainId:
          'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' as BridgeToken['chainId'],
        address: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501',
        symbol: 'SOL',
        decimals: 9,
      });
      mockGetDisplayCurrencyValue.mockReturnValue('$15.00');

      // Act
      const { result } = renderHookWithProvider(
        () => useDisplayCurrencyValue('0.1', solanaToken),
        { state: {} },
      );

      // Assert
      expect(result.current).toBe('$15.00');
      expect(mockGetDisplayCurrencyValue).toHaveBeenCalledWith(
        expect.objectContaining({ token: solanaToken, amount: '0.1' }),
      );
    });
  });
});
