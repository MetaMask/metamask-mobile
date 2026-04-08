import { renderHook, waitFor } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { TransactionType } from '@metamask/transaction-controller';
import { usePerpsBalanceTokenFilter } from './usePerpsBalanceTokenFilter';
import { useTransactionMetadataRequest } from '../../../Views/confirmations/hooks/transactions/useTransactionMetadataRequest';
import { useIsPerpsBalanceSelected } from './useIsPerpsBalanceSelected';
import {
  type AssetType,
  type TokenListItem,
  isHighlightedItemOutsideAssetList,
} from '../../../Views/confirmations/types/token';
import { usePerpsTrading } from './usePerpsTrading';
import { usePerpsPaymentToken } from './usePerpsPaymentToken';
import Routes from '../../../../constants/navigation/Routes';
import { useNavigation } from '@react-navigation/native';
import useApprovalRequest from '../../../Views/confirmations/hooks/useApprovalRequest';
import { selectPerpsAccountState } from '../selectors/perpsController';
import { selectPerpsPayWithAnyTokenAllowlistAssets } from '../selectors/featureFlags';

jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

jest.mock(
  '../../../Views/confirmations/hooks/transactions/useTransactionMetadataRequest',
);
jest.mock('./useIsPerpsBalanceSelected');
jest.mock('./usePerpsTrading');
jest.mock('../../../Views/confirmations/hooks/useApprovalRequest', () => ({
  __esModule: true,
  default: jest.fn(),
}));
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));
jest.mock('./usePerpsPaymentToken');
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
const mockUsePerpsTrading = usePerpsTrading as jest.MockedFunction<
  typeof usePerpsTrading
>;
const mockUsePerpsPaymentToken = usePerpsPaymentToken as jest.MockedFunction<
  typeof usePerpsPaymentToken
>;
const mockUseNavigation = useNavigation as jest.MockedFunction<
  typeof useNavigation
>;
const mockUseApprovalRequest = useApprovalRequest as jest.MockedFunction<
  typeof useApprovalRequest
>;

describe('usePerpsBalanceTokenFilter', () => {
  const chainId = '0xa4b1';
  const mockDepositWithConfirmation = jest.fn().mockResolvedValue(undefined);
  const mockNavigate = jest.fn();
  const mockOnReject = jest.fn();
  const mockOnPerpsPaymentTokenChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTransactionMetadataRequest.mockReturnValue(undefined);
    mockUseIsPerpsBalanceSelected.mockReturnValue(false);
    mockUseSelector.mockImplementation(
      (selector: (state: unknown) => unknown) => {
        if (selector === selectPerpsAccountState) {
          return { availableBalance: '1500.00' };
        }
        if (selector === selectPerpsPayWithAnyTokenAllowlistAssets) {
          return [];
        }
        return undefined;
      },
    );
    mockUsePerpsTrading.mockReturnValue({
      depositWithConfirmation: mockDepositWithConfirmation,
    } as unknown as ReturnType<typeof usePerpsTrading>);
    mockUseNavigation.mockReturnValue({
      navigate: mockNavigate,
    } as unknown as ReturnType<typeof useNavigation>);
    mockUseApprovalRequest.mockReturnValue({
      onReject: mockOnReject,
    } as unknown as ReturnType<typeof useApprovalRequest>);
    mockUsePerpsPaymentToken.mockReturnValue({
      onPaymentTokenChange: mockOnPerpsPaymentTokenChange,
    } as unknown as ReturnType<typeof usePerpsPaymentToken>);
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

    it('prepends highlighted row with perps balance and Add funds button', () => {
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
      expect(isHighlightedItemOutsideAssetList(output[0])).toBe(true);
      const highlightedAction = output[0];
      if (isHighlightedItemOutsideAssetList(highlightedAction)) {
        expect(highlightedAction.position).toBe('outside_of_asset_list');
        expect(highlightedAction.name).toBe(
          'perps.adjust_margin.perps_balance',
        );
        expect(highlightedAction.name_description).toBe('$2000.50');
        expect(highlightedAction.fiat).toBe('$2000.50');
        expect(highlightedAction.fiat_description).toBe('$2000.50');
        expect(highlightedAction.isSelected).toBe(true);
        expect(highlightedAction.actions).toHaveLength(1);
        expect(highlightedAction.actions?.[0]?.buttonLabel).toBe(
          'perps.add_funds',
        );
      }
      expect((output[1] as AssetType).address).toBe('0xusdc');
    });

    it('uses availableBalance from perps account in highlighted row', () => {
      mockUseSelector.mockReturnValue({
        availableBalance: '999.99',
      });
      const inputTokens: AssetType[] = [];

      const { result } = renderHook(() => usePerpsBalanceTokenFilter());
      const output = result.current(inputTokens);

      expect(output).toHaveLength(1);
      expect(isHighlightedItemOutsideAssetList(output[0])).toBe(true);
      if (isHighlightedItemOutsideAssetList(output[0])) {
        expect(output[0].name_description).toBe('$999.99');
        expect(output[0].fiat).toBe('$999.99');
      }
    });

    it('uses zero balance when perps account is null', () => {
      mockUseSelector.mockImplementation(
        (selector: (state: unknown) => unknown) => {
          if (selector === selectPerpsAccountState) return null;
          if (selector === selectPerpsPayWithAnyTokenAllowlistAssets) return [];
          return undefined;
        },
      );
      const inputTokens: AssetType[] = [];

      const { result } = renderHook(() => usePerpsBalanceTokenFilter());
      const output = result.current(inputTokens);

      expect(output).toHaveLength(1);
      expect(isHighlightedItemOutsideAssetList(output[0])).toBe(true);
      if (isHighlightedItemOutsideAssetList(output[0])) {
        expect(output[0].name_description).toBe('$0.00');
        expect(output[0].fiat).toBe('$0.00');
      }
    });

    it('clears isSelected on other tokens when perps balance is selected', () => {
      mockUseSelector.mockImplementation(
        (selector: (state: unknown) => unknown) => {
          if (selector === selectPerpsAccountState)
            return { availableBalance: '1500.00' };
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

      expect((output[1] as AssetType).isSelected).toBe(false);
      expect((output[2] as AssetType).isSelected).toBe(false);
    });

    it('keeps token isSelected when perps balance is not selected', () => {
      mockUseSelector.mockImplementation(
        (selector: (state: unknown) => unknown) => {
          if (selector === selectPerpsAccountState)
            return { availableBalance: '1500.00' };
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

      expect((output[1] as AssetType).isSelected).toBe(true);
    });

    it('filters to only allowlisted tokens when allowlist is set', () => {
      const allowlistKey = `${chainId}.0xusdc`.toLowerCase();
      mockUseSelector.mockImplementation(
        (selector: (state: unknown) => unknown) => {
          if (selector === selectPerpsAccountState)
            return { availableBalance: '100.00' };
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

      expect(output).toHaveLength(2);
      expect(isHighlightedItemOutsideAssetList(output[0])).toBe(true);
      expect((output[1] as AssetType).address).toBe('0xusdc');
      expect((output[1] as AssetType).symbol).toBe('USDC');
    });

    it('calls onReject, depositWithConfirmation and navigation.navigate when Add funds is pressed', async () => {
      mockUseSelector.mockReturnValue({
        availableBalance: '500.00',
      });
      const inputTokens: AssetType[] = [
        {
          address: '0xusdc',
          chainId,
          symbol: 'USDC',
          name: 'USD Coin',
          balance: '100',
        } as AssetType,
      ];

      const { result } = renderHook(() => usePerpsBalanceTokenFilter());
      const output = result.current(inputTokens);

      expect(output).toHaveLength(2);
      const highlightedAction = output[0];
      expect(isHighlightedItemOutsideAssetList(highlightedAction)).toBe(true);
      if (isHighlightedItemOutsideAssetList(highlightedAction)) {
        highlightedAction.actions?.[0]?.onPress();
        await waitFor(
          () => {
            expect(mockOnReject).toHaveBeenCalledTimes(1);
            expect(mockDepositWithConfirmation).toHaveBeenCalledTimes(1);
            expect(mockNavigate).toHaveBeenCalledWith(
              Routes.FULL_SCREEN_CONFIRMATIONS.REDESIGNED_CONFIRMATIONS,
              { showPerpsHeader: true },
            );
          },
          { timeout: 2000 },
        );
      }
    });

    it('calls onPerpsPaymentTokenChange with null when row action is invoked', () => {
      mockUseSelector.mockReturnValue({
        availableBalance: '100.00',
      });
      const inputTokens: AssetType[] = [];

      const { result } = renderHook(() => usePerpsBalanceTokenFilter());
      const output = result.current(inputTokens);

      expect(output).toHaveLength(1);
      const highlightedAction = output[0];
      expect(isHighlightedItemOutsideAssetList(highlightedAction)).toBe(true);
      if (isHighlightedItemOutsideAssetList(highlightedAction)) {
        highlightedAction.action();
        expect(mockOnPerpsPaymentTokenChange).toHaveBeenCalledWith(null);
      }
    });
  });
});
