import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { TransactionType } from '@metamask/transaction-controller';
import { usePerpsBalanceTokenFilter } from './usePerpsBalanceTokenFilter';
import { useTransactionMetadataRequest } from '../../../Views/confirmations/hooks/transactions/useTransactionMetadataRequest';
import { useIsPerpsBalanceSelected } from './useIsPerpsBalanceSelected';
import {
  type AssetType,
  type TokenListItem,
} from '../../../Views/confirmations/types/token';
import { selectPerpsPayWithAnyTokenAllowlistAssets } from '../selectors/featureFlags';

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
    mockUseSelector.mockImplementation(
      (selector: (state: unknown) => unknown) => {
        if (selector === selectPerpsPayWithAnyTokenAllowlistAssets) {
          return [];
        }
        return undefined;
      },
    );
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
      const output: TokenListItem[] = filter(inputTokens);

      expect(output).toBe(inputTokens);
      expect(output).toHaveLength(1);
      expect((output[0] as AssetType).address).toBe('0xabc');
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

    it('returns mapped tokens without synthetic highlighted row', () => {
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

      expect(output).toHaveLength(1);
      expect((output[0] as AssetType).address).toBe('0xusdc');
    });

    it('clears isSelected on other tokens when perps balance is selected', () => {
      mockUseSelector.mockImplementation(
        (selector: (state: unknown) => unknown) => {
          if (selector === selectPerpsPayWithAnyTokenAllowlistAssets) return [];
          return undefined;
        },
      );
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

      expect(output).toHaveLength(2);
      expect((output[0] as AssetType).isSelected).toBe(false);
      expect((output[1] as AssetType).isSelected).toBe(false);
    });

    it('keeps token isSelected when perps balance is not selected', () => {
      mockUseSelector.mockImplementation(
        (selector: (state: unknown) => unknown) => {
          if (selector === selectPerpsPayWithAnyTokenAllowlistAssets) return [];
          return undefined;
        },
      );
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

      expect(output).toHaveLength(1);
      expect((output[0] as AssetType).isSelected).toBe(true);
    });

    it('filters to only allowlisted tokens when allowlist is set', () => {
      const allowlistKey = `${chainId}.0xusdc`.toLowerCase();
      mockUseSelector.mockImplementation(
        (selector: (state: unknown) => unknown) => {
          if (selector === selectPerpsPayWithAnyTokenAllowlistAssets)
            return [allowlistKey];
          return [];
        },
      );
      const inputTokens: AssetType[] = [
        {
          address: '0xusdc',
          chainId,
          symbol: 'USDC',
          name: 'USD Coin',
          balance: '500',
        } as AssetType,
        {
          address: '0xother',
          chainId,
          symbol: 'OTHER',
          name: 'Other',
          balance: '100',
        } as AssetType,
      ];

      const { result } = renderHook(() => usePerpsBalanceTokenFilter());
      const output = result.current(inputTokens);

      expect(output).toHaveLength(1);
      expect((output[0] as AssetType).address).toBe('0xusdc');
      expect((output[0] as AssetType).symbol).toBe('USDC');
    });
  });
});
