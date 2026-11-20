import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { selectGlassHeadersEnabled } from '../../selectors/featureFlagController/glassHeaders';
import { useIsGlassHeader } from './useIsGlassHeader';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

describe('useIsGlassHeader', () => {
  it('reads the glass headers flag', () => {
    jest.mocked(useSelector).mockReturnValue(true);

    renderHook(() => useIsGlassHeader());

    expect(useSelector).toHaveBeenCalledWith(selectGlassHeadersEnabled);
  });

  it.each([
    [true, true],
    [false, false],
    [undefined, false],
    [{}, false],
  ])('maps a flag value of %p to %p', (flagValue, expected) => {
    jest.mocked(useSelector).mockReturnValue(flagValue);

    const { result } = renderHook(() => useIsGlassHeader());

    expect(result.current).toBe(expected);
  });
});
