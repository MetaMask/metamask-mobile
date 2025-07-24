import useSupportedTokens from './useSupportedTokens';
import { SUPPORTED_DEPOSIT_TOKENS } from '../constants';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';

const mockUseChainIdsWithBalance = jest.fn().mockImplementation(() => []);
jest.mock('./useChainIdsWithBalance', () => () => mockUseChainIdsWithBalance());

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
});
