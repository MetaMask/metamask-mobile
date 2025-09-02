import useSupportedTokens from './useSupportedTokens';
import {
  SUPPORTED_DEPOSIT_TOKENS,
  CONDITIONALLY_SUPPORTED_DEPOSIT_TOKENS,
} from '../constants';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { LINEA_MAINNET } from '../constants/networks';

const mockUseChainIdsWithBalance = jest.fn().mockImplementation(() => []);
const mockUseIsCardholder = jest.fn().mockImplementation(() => false);

jest.mock('./useChainIdsWithBalance', () => () => mockUseChainIdsWithBalance());
jest.mock('../../../Card/hooks/useIsCardholder', () => ({
  useIsCardholder: () => mockUseIsCardholder(),
}));

describe('useSupportedTokens', () => {
  it('should return supported tokens', () => {
    const { result } = renderHookWithProvider(() => useSupportedTokens());

    expect(result.current).toEqual(SUPPORTED_DEPOSIT_TOKENS);
  });

  it('should return conditionally supported tokens based on chain IDs', () => {
    mockUseChainIdsWithBalance.mockReturnValue([
      'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
    ]);
    const { result } = renderHookWithProvider(() => useSupportedTokens());

    expect(result.current).toContainEqual(
      expect.objectContaining({
        chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      }),
    );
  });

  it('should include LINEA conditionally supported tokens when isCardholder is true', () => {
    mockUseIsCardholder.mockReturnValue(true);
    mockUseChainIdsWithBalance.mockReturnValue([]);
    const { result } = renderHookWithProvider(() => useSupportedTokens());

    const expectedTokens = CONDITIONALLY_SUPPORTED_DEPOSIT_TOKENS.filter(
      (token) => token.chainId === LINEA_MAINNET.chainId,
    );

    expect(result.current).toEqual(
      expect.arrayContaining([...SUPPORTED_DEPOSIT_TOKENS, ...expectedTokens]),
    );
  });

  it('should not include LINEA conditionally supported tokens when isCardholder is false', () => {
    mockUseIsCardholder.mockReturnValue(false);
    mockUseChainIdsWithBalance.mockReturnValue([]);
    const { result } = renderHookWithProvider(() => useSupportedTokens());

    expect(result.current).toEqual(SUPPORTED_DEPOSIT_TOKENS);
  });

  it('should include MUSD tokens when metamaskUsdEnabled is true', () => {
    const mockFeatureFlags = {
      metamaskUsdEnabled: true,
    };

    const { result } = renderHookWithProvider(() => useSupportedTokens(), {
      state: {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                depositConfig: {
                  features: mockFeatureFlags,
                },
              },
            },
          },
        },
      },
    });

    expect(result.current).toEqual(
      expect.arrayContaining([
        ...SUPPORTED_DEPOSIT_TOKENS,
        expect.objectContaining({ symbol: 'mUSD' }),
      ]),
    );
  });

  it('should not include MUSD tokens when metamaskUsdEnabled is false', () => {
    const mockFeatureFlags = {
      metamaskUsdEnabled: false,
    };

    const { result } = renderHookWithProvider(() => useSupportedTokens(), {
      state: {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                depositConfig: {
                  features: mockFeatureFlags,
                },
              },
            },
          },
        },
      },
    });

    expect(result.current).toEqual(SUPPORTED_DEPOSIT_TOKENS);
  });
});
