import { renderHook } from '@testing-library/react-native';
import { AssetType } from '../../../Views/confirmations/types/token';
import { hasTransactionType } from '../../../Views/confirmations/utils/transaction';
import {
  PREDICT_BALANCE_CHAIN_ID,
  PREDICT_BALANCE_PLACEHOLDER_ADDRESS,
} from '../constants/transactions';
import { usePredictBalanceTokenFilter } from './usePredictBalanceTokenFilter';

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

jest.mock('../../../Views/confirmations/utils/transaction', () => ({
  hasTransactionType: jest.fn(),
}));

const mockHasTransactionType = hasTransactionType as jest.MockedFunction<
  typeof hasTransactionType
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
  });

  it('returns original tokens when transaction type does not match and forceEnabled is false', () => {
    const tokens = [createMockToken()];
    mockHasTransactionType.mockReturnValue(false);

    const { result } = renderHook(() => usePredictBalanceTokenFilter());
    const filteredTokens = result.current(tokens);

    expect(filteredTokens).toEqual(tokens);
  });

  it('prepends Predict balance token when transaction type matches', () => {
    const tokens = [createMockToken()];
    mockHasTransactionType.mockReturnValue(true);

    const { result } = renderHook(() => usePredictBalanceTokenFilter());
    const filteredTokens = result.current(tokens);

    expect(filteredTokens).toHaveLength(2);
    expect(filteredTokens[0].address).toBe(PREDICT_BALANCE_PLACEHOLDER_ADDRESS);
  });

  it('prepends Predict balance token when forceEnabled is true', () => {
    const tokens = [createMockToken()];
    mockHasTransactionType.mockReturnValue(false);

    const { result } = renderHook(() => usePredictBalanceTokenFilter(true));
    const filteredTokens = result.current(tokens);

    expect(filteredTokens).toHaveLength(2);
    expect(filteredTokens[0].address).toBe(PREDICT_BALANCE_PLACEHOLDER_ADDRESS);
  });

  it('sets Predict balance token as selected when isPredictBalanceSelected is true', () => {
    mockIsPredictBalanceSelected = true;
    mockHasTransactionType.mockReturnValue(true);
    const tokens = [createMockToken()];

    const { result } = renderHook(() => usePredictBalanceTokenFilter());
    const filteredTokens = result.current(tokens);

    expect(filteredTokens[0].isSelected).toBe(true);
  });

  it('deselects existing tokens when Predict balance is selected', () => {
    mockIsPredictBalanceSelected = true;
    mockHasTransactionType.mockReturnValue(true);
    const tokens = [createMockToken({ isSelected: true })];

    const { result } = renderHook(() => usePredictBalanceTokenFilter());
    const filteredTokens = result.current(tokens);

    expect(filteredTokens[1].isSelected).toBe(false);
  });

  it('preserves existing token isSelected when Predict balance is not selected', () => {
    mockIsPredictBalanceSelected = false;
    mockHasTransactionType.mockReturnValue(true);
    const tokens = [createMockToken({ isSelected: true })];

    const { result } = renderHook(() => usePredictBalanceTokenFilter());
    const filteredTokens = result.current(tokens);

    expect(filteredTokens[1].isSelected).toBe(true);
  });

  it('formats Predict balance using fiat formatter', () => {
    mockPredictBalance = 42.5;
    mockHasTransactionType.mockReturnValue(true);
    const tokens = [createMockToken()];

    const { result } = renderHook(() => usePredictBalanceTokenFilter());
    const filteredTokens = result.current(tokens);

    expect(filteredTokens[0].balanceInSelectedCurrency).toBe('$42.50');
  });

  it('uses PREDICT_BALANCE_PLACEHOLDER_ADDRESS for synthetic token', () => {
    mockHasTransactionType.mockReturnValue(true);
    const tokens = [createMockToken()];

    const { result } = renderHook(() => usePredictBalanceTokenFilter());
    const filteredTokens = result.current(tokens);

    expect(filteredTokens[0].address).toBe(PREDICT_BALANCE_PLACEHOLDER_ADDRESS);
    expect(filteredTokens[0].tokenId).toBe(PREDICT_BALANCE_PLACEHOLDER_ADDRESS);
  });

  it('uses PREDICT_BALANCE_CHAIN_ID for synthetic token', () => {
    mockHasTransactionType.mockReturnValue(true);
    const tokens = [createMockToken()];

    const { result } = renderHook(() => usePredictBalanceTokenFilter());
    const filteredTokens = result.current(tokens);

    expect(filteredTokens[0].chainId).toBe(PREDICT_BALANCE_CHAIN_ID);
  });

  it('sets symbol to USDC.e on the Predict balance token', () => {
    mockHasTransactionType.mockReturnValue(true);
    const tokens = [createMockToken()];

    const { result } = renderHook(() => usePredictBalanceTokenFilter());
    const filteredTokens = result.current(tokens);

    expect(filteredTokens[0].symbol).toBe('USDC.e');
  });
});
