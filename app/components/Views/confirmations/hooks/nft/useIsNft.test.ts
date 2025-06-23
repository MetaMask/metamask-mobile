import { useIsNft } from './useIsNft';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { useGetTokenStandardAndDetails } from '../useGetTokenStandardAndDetails';

jest.mock('../transactions/useTransactionMetadataRequest', () => ({
  useTransactionMetadataRequest: jest.fn().mockReturnValue({
    txParams: {
      to: '0x0000000000000000000000000000000000000000',
    },
  }),
}));

jest.mock('../useGetTokenStandardAndDetails', () => ({
  useGetTokenStandardAndDetails: jest.fn().mockReturnValue({
    details: {
      standard: 'ERC721',
    },
    isPending: false,
  }),
}));

describe('useIsNft', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns isNft true when token standard is not ERC20', () => {
    const { result } = renderHookWithProvider(useIsNft, {
      state: {
        engine: {
          backgroundState,
        },
      },
    });

    expect(result.current).toEqual({
      isNft: true,
      isPending: false,
    });
  });

  it('returns isNft false when token standard is ERC20', () => {
    (useGetTokenStandardAndDetails as jest.Mock).mockReturnValue({
      details: {
        standard: 'ERC20',
      },
      isPending: false,
    });

    const { result } = renderHookWithProvider(useIsNft, {
      state: {
        engine: {
          backgroundState,
        },
      },
    });

    expect(result.current).toEqual({
      isNft: false,
      isPending: false,
    });
  });
});
