import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { TransactionType } from '@metamask/transaction-controller';
import { usePerpsBalanceTokenFilter } from './usePerpsBalanceTokenFilter';
import { useTransactionMetadataRequest } from '../../../Views/confirmations/hooks/transactions/useTransactionMetadataRequest';
import { useIsPerpsBalanceSelected } from './useIsPerpsBalanceSelected';
import {
  PERPS_BALANCE_PLACEHOLDER_ADDRESS,
  PERPS_CONSTANTS,
} from '../constants/perpsConfig';
import type { AssetType } from '../../../Views/confirmations/types/token';

jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

jest.mock(
  '../../../Views/confirmations/hooks/transactions/useTransactionMetadataRequest',
);
jest.mock('./useIsPerpsBalanceSelected');
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('images/perps-pay-token-icon.png', () => ({
  uri: 'perps-pay-token-icon-uri',
}));

jest.mock('../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter', () =>
  jest.fn(
    () => (value: { toNumber: () => number }) =>
      `$${value.toNumber().toFixed(2)}`,
  ),
);

const mockUseTransactionMetadataRequest =
  useTransactionMetadataRequest as jest.MockedFunction<
    typeof useTransactionMetadataRequest
  >;
const mockUseIsPerpsBalanceSelected =
  useIsPerpsBalanceSelected as jest.MockedFunction<
    typeof useIsPerpsBalanceSelected
  >;
const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

describe('usePerpsBalanceTokenFilter', () => {
  const chainId = '0xa4b1';

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTransactionMetadataRequest.mockReturnValue(undefined);
    mockUseIsPerpsBalanceSelected.mockReturnValue(false);
    mockUseSelector.mockImplementation((selector) => {
      if (selector.name === 'selectPerpsAccountState') {
        return { availableBalance: '1500.00' };
      }
      return undefined;
    });
  });

  describe('when transaction is not perpsDepositAndOrder', () => {
    it('returns tokens unchanged', () => {
      mockUseTransactionMetadataRequest.mockReturnValue({
        type: TransactionType.simpleSend,
      } as ReturnType<typeof useTransactionMetadataRequest>);
      const inputTokens: AssetType[] = [
        {
          address: '0xabc',
          chainId,
          symbol: 'USDC',
          name: 'USD Coin',
          balance: '100',
        } as AssetType,
      ];

      const { result } = renderHook(() => usePerpsBalanceTokenFilter());
      const filter = result.current;
      const output = filter(inputTokens);

      expect(output).toBe(inputTokens);
      expect(output).toHaveLength(1);
      expect(output[0].address).toBe('0xabc');
    });

    it('returns tokens unchanged when transaction meta is undefined', () => {
      mockUseTransactionMetadataRequest.mockReturnValue(undefined);
      const inputTokens: AssetType[] = [
        { address: '0xdef', chainId, symbol: 'ETH' } as AssetType,
      ];

      const { result } = renderHook(() => usePerpsBalanceTokenFilter());
      const output = result.current(inputTokens);

      expect(output).toEqual(inputTokens);
    });
  });

  describe('when transaction is perpsDepositAndOrder', () => {
    beforeEach(() => {
      mockUseTransactionMetadataRequest.mockReturnValue({
        type: TransactionType.perpsDepositAndOrder,
      } as ReturnType<typeof useTransactionMetadataRequest>);
    });

    it('prepends perps balance token with correct shape', () => {
      mockUseSelector.mockReturnValue({
        availableBalance: '2000.50',
      });
      mockUseIsPerpsBalanceSelected.mockReturnValue(true);
      const inputTokens: AssetType[] = [
        {
          address: '0xusdc',
          chainId,
          symbol: 'USDC',
          name: 'USD Coin',
          balance: '500',
          isSelected: false,
        } as AssetType,
      ];

      const { result } = renderHook(() => usePerpsBalanceTokenFilter());
      const output = result.current(inputTokens);

      expect(output).toHaveLength(2);
      const perpsToken = output[0];
      expect(perpsToken.address).toBe(PERPS_BALANCE_PLACEHOLDER_ADDRESS);
      expect(perpsToken.tokenId).toBe(PERPS_BALANCE_PLACEHOLDER_ADDRESS);
      expect(perpsToken.name).toBe('perps.adjust_margin.perps_balance');
      expect(perpsToken.symbol).toBe('USD');
      expect(perpsToken.balance).toBe('2000.50');
      expect(perpsToken.balanceInSelectedCurrency).toBe('$2000.50');
      expect(perpsToken.decimals).toBe(2);
      expect(perpsToken.isETH).toBe(false);
      expect(perpsToken.isNative).toBe(false);
      expect(perpsToken.isSelected).toBe(true);
      expect(perpsToken.description).toBe(
        PERPS_CONSTANTS.PerpsBalanceTokenDescription,
      );
    });

    it('uses availableBalance from perps account', () => {
      mockUseSelector.mockReturnValue({
        availableBalance: '999.99',
      });
      const inputTokens: AssetType[] = [];

      const { result } = renderHook(() => usePerpsBalanceTokenFilter());
      const output = result.current(inputTokens);

      expect(output[0].balance).toBe('999.99');
      expect(output[0].balanceInSelectedCurrency).toBe('$999.99');
    });

    it('uses zero balance when perps account is null', () => {
      mockUseSelector.mockReturnValue(null);
      const inputTokens: AssetType[] = [];

      const { result } = renderHook(() => usePerpsBalanceTokenFilter());
      const output = result.current(inputTokens);

      expect(output[0].balance).toBe('0');
      expect(output[0].balanceInSelectedCurrency).toBe('$0.00');
    });

    it('clears isSelected on other tokens when perps balance is selected', () => {
      mockUseIsPerpsBalanceSelected.mockReturnValue(true);
      const inputTokens: AssetType[] = [
        {
          address: '0xa',
          chainId,
          symbol: 'USDC',
          isSelected: true,
        } as AssetType,
        {
          address: '0xb',
          chainId,
          symbol: 'DAI',
          isSelected: false,
        } as AssetType,
      ];

      const { result } = renderHook(() => usePerpsBalanceTokenFilter());
      const output = result.current(inputTokens);

      expect(output[1].isSelected).toBe(false);
      expect(output[2].isSelected).toBe(false);
    });

    it('keeps token isSelected when perps balance is not selected', () => {
      mockUseIsPerpsBalanceSelected.mockReturnValue(false);
      const inputTokens: AssetType[] = [
        {
          address: '0xa',
          chainId,
          symbol: 'USDC',
          isSelected: true,
        } as AssetType,
      ];

      const { result } = renderHook(() => usePerpsBalanceTokenFilter());
      const output = result.current(inputTokens);

      expect(output[1].isSelected).toBe(true);
    });
  });
});
