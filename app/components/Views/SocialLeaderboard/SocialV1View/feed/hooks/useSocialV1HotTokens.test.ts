import { renderHook } from '@testing-library/react-native';
import { MOCK_SOCIAL_V1_HOT_TOKENS } from '../mocks/socialV1HotTokens.mock';
import { useSocialV1HotTokens } from './useSocialV1HotTokens';

describe('useSocialV1HotTokens', () => {
  it('returns the mock hot tokens in a settled state', () => {
    const { result } = renderHook(() => useSocialV1HotTokens());

    expect(result.current.tokens).toEqual(MOCK_SOCIAL_V1_HOT_TOKENS);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  // Equities and commodities only publish icons under their HIP-3 market id,
  // so a display symbol here would silently 404 every equity chip's icon.
  it('uses raw perps market ids for equity and commodity symbols', () => {
    const { result } = renderHook(() => useSocialV1HotTokens());

    const nvidia = result.current.tokens.find(
      (token) => token.label === 'NVIDIA',
    );
    expect(nvidia?.symbol).toBe('xyz:NVDA');
  });
});
