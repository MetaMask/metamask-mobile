import { renderHook } from '@testing-library/react-native';
import { AssetType } from '../../../Views/confirmations/types/token';
import { hasTransactionType } from '../../../Views/confirmations/utils/transaction';
import { usePredictBalanceTokenFilter } from './usePredictBalanceTokenFilter';

let mockTransactionMeta: { type?: string } | null = null;

jest.mock(
  '../../../Views/confirmations/hooks/transactions/useTransactionMetadataRequest',
  () => ({
    useTransactionMetadataRequest: () => mockTransactionMeta,
  }),
);

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

  it('returns tokens unchanged when transaction type matches', () => {
    const tokens = [createMockToken()];
    mockHasTransactionType.mockReturnValue(true);

    const { result } = renderHook(() => usePredictBalanceTokenFilter());
    const filteredTokens = result.current(tokens);

    expect(filteredTokens).toEqual(tokens);
    expect(filteredTokens).toHaveLength(1);
  });

  it('returns tokens unchanged when forceEnabled is true', () => {
    const tokens = [createMockToken()];
    mockHasTransactionType.mockReturnValue(false);

    const { result } = renderHook(() => usePredictBalanceTokenFilter(true));
    const filteredTokens = result.current(tokens);

    expect(filteredTokens).toEqual(tokens);
    expect(filteredTokens).toHaveLength(1);
  });
});
