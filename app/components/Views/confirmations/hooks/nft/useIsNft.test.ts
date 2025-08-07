import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { TokenStandard } from '../../../../UI/SimulationDetails/types';
import { useGetTokenStandardAndDetails } from '../useGetTokenStandardAndDetails';
import { useIsNft } from './useIsNft';

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

  it.each([
    { standard: TokenStandard.ERC1155, isNft: true },
    { standard: TokenStandard.ERC721, isNft: true },
    { standard: TokenStandard.ERC20, isNft: false },
  ])(
    'returns isNft $isNft when token standard is $standard',
    ({ standard, isNft }) => {
      (useGetTokenStandardAndDetails as jest.Mock).mockReturnValue({
        details: {
          standard,
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
        isNft,
        isPending: false,
      });
    },
  );

  it('returns undefined when token standard is undefined', () => {
    (useGetTokenStandardAndDetails as jest.Mock).mockReturnValue({
      details: undefined,
      isPending: true,
    });

    const { result } = renderHookWithProvider(useIsNft, {
      state: {
        engine: {
          backgroundState,
        },
      },
    });

    expect(result.current).toEqual({
      isNft: undefined,
      isPending: true,
    });
  });

  it('when token standard is on pending state, returns undefined', () => {
    (useGetTokenStandardAndDetails as jest.Mock).mockReturnValue({
      details: undefined,
      isPending: true,
    });

    const { result } = renderHookWithProvider(useIsNft, {
      state: {
        engine: {
          backgroundState,
        },
      },
    });

    expect(result.current).toEqual({
      isNft: undefined,
      isPending: true,
    });
  });
});
