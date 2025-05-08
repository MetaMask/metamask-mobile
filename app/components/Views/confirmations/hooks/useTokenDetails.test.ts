import { TokenListToken } from '@metamask/assets-controllers';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import { useTransactionMetadataRequest } from './transactions/useTransactionMetadataRequest';
import { useTokenDetails } from './useTokenDetails';

jest.mock('./transactions/useTransactionMetadataRequest', () => ({
  useTransactionMetadataRequest: jest.fn(),
}));

const mockTokenList = {
  '0xabcd123': {
    name: 'Test Token',
    symbol: 'TEST',
    decimals: 18,
    address: '0xabcd123',
    occurrences: 1,
    aggregators: [],
    iconUrl: 'test.png'
  } as TokenListToken
};

const mockProviderValues = {
  state: {
    engine: {
      backgroundState: {
        TokenListController: {
        tokensChainsCache: {
          '0x1': {
            data: mockTokenList
          }
        }
        },
      },
    },
  },
};

jest.mock('../../../../selectors/tokenListController', () => ({
  selectTokenList: () => mockTokenList,
}));

describe('useTokenDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns empty object if no addressTo in transaction metadata', () => {
    (useTransactionMetadataRequest as jest.Mock).mockReturnValue({
      txParams: {}
    });

    const { result } = renderHookWithProvider(() => useTokenDetails(), mockProviderValues);

    expect(result.current).toEqual({});
  });

  it('returns empty object if addressTo does not match any token', () => {
    (useTransactionMetadataRequest as jest.Mock).mockReturnValue({
      txParams: {
        to: '0x1111111'
      }
    });

    const { result } = renderHookWithProvider(() => useTokenDetails(), mockProviderValues);

    expect(result.current).toEqual({});
  });

  it('returns token details if addressTo matches token in list', () => {
    (useTransactionMetadataRequest as jest.Mock).mockReturnValue({
      txParams: {
        to: '0xabcd123'
      }
    });

    const { result } = renderHookWithProvider(() => useTokenDetails(), mockProviderValues);

    expect(result.current).toEqual(mockTokenList['0xabcd123']);
  });
});
