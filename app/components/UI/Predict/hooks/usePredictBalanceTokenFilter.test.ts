import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import {
  AssetType,
  HighlightedItem,
  isHighlightedItemInAssetList,
} from '../../../Views/confirmations/types/token';
import { hasTransactionType } from '../../../Views/confirmations/utils/transaction';
import { isPayWithBottomSheetEnabled } from '../../../Views/confirmations/utils/transaction-pay';
import { usePredictBalanceTokenFilter } from './usePredictBalanceTokenFilter';
import { dismissActivePreviewSheet } from '../contexts';
import Routes from '../../../../constants/navigation/Routes';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

let mockIsPredictBalanceSelected = false;
let mockPredictBalance = 100;
let mockTransactionMeta: { type?: string } | null = null;

jest.mock('./usePredictPaymentToken', () => ({
  usePredictPaymentToken: () => ({
    isPredictBalanceSelected: mockIsPredictBalanceSelected,
  }),
}));

jest.mock('./usePredictBalance', () => ({
  usePredictBalance: () => ({
    data: mockPredictBalance,
  }),
}));

jest.mock(
  '../../../Views/confirmations/hooks/transactions/useTransactionMetadataRequest',
  () => ({
    useTransactionMetadataRequest: () => mockTransactionMeta,
  }),
);

jest.mock('../../SimulationDetails/FiatDisplay/useFiatFormatter', () => ({
  __esModule: true,
  default: () => (value: { toString: () => string }) =>
    `$${Number(value.toString()).toFixed(2)}`,
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../Views/confirmations/utils/transaction', () => ({
  hasTransactionType: jest.fn(),
}));

jest.mock('../../../Views/confirmations/utils/transaction-pay', () => ({
  ...jest.requireActual('../../../Views/confirmations/utils/transaction-pay'),
  isPayWithBottomSheetEnabled: jest.fn(() => false),
}));

const mockOnReject = jest.fn();
jest.mock('../../../Views/confirmations/hooks/useApprovalRequest', () => ({
  __esModule: true,
  default: () => ({ onReject: mockOnReject, approvalRequest: { id: 'test' } }),
}));

jest.mock('../contexts', () => ({
  dismissActivePreviewSheet: jest.fn(),
}));

const mockHasTransactionType = hasTransactionType as jest.MockedFunction<
  typeof hasTransactionType
>;
const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockIsPayWithBottomSheetEnabled =
  
 as jest.MockedFunction<
    typeof isPayWithBottomSheetEnabled
  >;

const createMockToken = (overrides?: Partial<AssetType>): AssetType => ({
  address: '0xtoken1',
  chainId: '0x1',
  tokenId: '0xtoken1',
  name: 'Test Token',
  symbol: 'TST',
  balance: '100',
  balanceInSelectedCurrency: '$100.00',
  image: '',
  logo: '',
  decimals: 18,
  isETH: false,
  isNative: false,
  isSelected: false,
  ...overrides,
});

describe('usePredictBalanceTokenFilter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsPredictBalanceSelected = false;
    mockPredictBalance = 100;
    mockTransactionMeta = null;
    mockHasTransactionType.mockReturnValue(false);
    mockUseSelector.mockReturnValue({ image: 'pusd-token-image' });
    mockNavigate.mockReset();
    mockIsPayWithBottomSheetEnabled.mockReturnValue(false);
    mockOnReject.mockReset();
  });

  it('returns original tokens when transaction type does not match and forceEnabled is false', () => {
    const tokens = [createMockToken()];
    mockHasTransactionType.mockReturnValue(false);

    const { result } = renderHook(() => usePredictBalanceTokenFilter());
    const filteredTokens = result.current(tokens);

    expect(filteredTokens).toEqual(tokens);
  });

  it('prepends Predict balance HighlightedItem when transaction type matches', () => {
    const tokens = [createMockToken()];
    mockHasTransactionType.mockReturnValue(true);

    const { result } = renderHook(() => usePredictBalanceTokenFilter());
    const filteredTokens = result.current(tokens);

    expect(filteredTokens).toHaveLength(2);
    expect(isHighlightedItemInAssetList(filteredTokens[0])).toBe(true);
  });

  it('suppresses the Predict balance HighlightedItem when isPayWithBottomSheetEnabled returns true', () => {
    const tokens = [createMockToken()];
    mockHasTransactionType.mockReturnValue(true);
    mockIsPayWithBottomSheetEnabled.mockReturnValue(true);

    const { result } = renderHook(() => usePredictBalanceTokenFilter());
    const filteredTokens = result.current(tokens);

    expect(filteredTokens).toEqual(tokens);
  });

  it('prepends Predict balance HighlightedItem when forceEnabled is true', () => {
    const tokens = [createMockToken()];
    mockHasTransactionType.mockReturnValue(false);

    const { result } = renderHook(() => usePredictBalanceTokenFilter(true));
    const filteredTokens = result.current(tokens);

    expect(filteredTokens).toHaveLength(2);
    expect(isHighlightedItemInAssetList(filteredTokens[0])).toBe(true);
  });

  it('sets the Predict balance row as selected when isPredictBalanceSelected is true', () => {
    mockIsPredictBalanceSelected = true;
    mockHasTransactionType.mockReturnValue(true);
    const tokens = [createMockToken()];

    const { result } = renderHook(() => usePredictBalanceTokenFilter());
    const filteredTokens = result.current(tokens);

    expect((filteredTokens[0] as HighlightedItem).isSelected).toBe(true);
  });

  it('deselects existing tokens when Predict balance is selected', () => {
    mockIsPredictBalanceSelected = true;
    mockHasTransactionType.mockReturnValue(true);
    const tokens = [createMockToken({ isSelected: true })];

    const { result } = renderHook(() => usePredictBalanceTokenFilter());
    const filteredTokens = result.current(tokens);

    expect((filteredTokens[1] as AssetType).isSelected).toBe(false);
  });

  it('preserves existing token isSelected when Predict balance is not selected', () => {
    mockIsPredictBalanceSelected = false;
    mockHasTransactionType.mockReturnValue(true);
    const tokens = [createMockToken({ isSelected: true })];

    const { result } = renderHook(() => usePredictBalanceTokenFilter());
    const filteredTokens = result.current(tokens);

    expect((filteredTokens[1] as AssetType).isSelected).toBe(true);
  });

  it('formats the Predict balance as a fiat string in the HighlightedItem', () => {
    mockPredictBalance = 42.5;
    mockHasTransactionType.mockReturnValue(true);
    const tokens = [createMockToken()];

    const { result } = renderHook(() => usePredictBalanceTokenFilter());
    const filteredTokens = result.current(tokens);

    expect((filteredTokens[0] as HighlightedItem).fiat).toBe('$42.50');
  });

  it('shows name_description as pUSD on the Predict balance row', () => {
    mockHasTransactionType.mockReturnValue(true);
    const tokens = [createMockToken()];

    const { result } = renderHook(() => usePredictBalanceTokenFilter());
    const filteredTokens = result.current(tokens);

    expect((filteredTokens[0] as HighlightedItem).name_description).toBe(
      'pUSD',
    );
  });

  it('uses empty string for icon when pusdToken is null', () => {
    mockHasTransactionType.mockReturnValue(true);
    mockUseSelector.mockReturnValue(null);
    const tokens = [createMockToken()];

    const { result } = renderHook(() => usePredictBalanceTokenFilter());
    const filteredTokens = result.current(tokens);

    expect((filteredTokens[0] as HighlightedItem).icon).toBe('');
  });

  it('always includes an Add action button on the Predict balance row', () => {
    mockHasTransactionType.mockReturnValue(true);
    const tokens = [createMockToken()];

    const { result } = renderHook(() => usePredictBalanceTokenFilter());
    const filteredTokens = result.current(tokens);

    const item = filteredTokens[0] as HighlightedItem;
    expect(item.actions).toHaveLength(1);
    expect(item.actions?.[0].buttonLabel).toBeTruthy();
  });

  it('rejects the current approval and navigates to ADD_FUNDS_SHEET when the Add action is pressed', () => {
    mockHasTransactionType.mockReturnValue(true);
    const tokens = [createMockToken()];

    const { result } = renderHook(() => usePredictBalanceTokenFilter());
    const filteredTokens = result.current(tokens);

    const item = filteredTokens[0] as HighlightedItem;
    item.actions?.[0].onPress();

    expect(dismissActivePreviewSheet).toHaveBeenCalledTimes(1);
    expect(mockOnReject).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.MODALS.ROOT, {
      screen: Routes.PREDICT.MODALS.ADD_FUNDS_SHEET,
      params: { autoDeposit: true },
    });
  });

  it('calls onSelect when the row action is triggered', () => {
    mockHasTransactionType.mockReturnValue(true);
    const mockOnSelect = jest.fn();
    const tokens = [createMockToken()];

    const { result } = renderHook(() =>
      usePredictBalanceTokenFilter(true, mockOnSelect),
    );
    const filteredTokens = result.current(tokens);

    const item = filteredTokens[0] as HighlightedItem;
    item.action();

    expect(mockOnSelect).toHaveBeenCalledTimes(1);
  });
});
