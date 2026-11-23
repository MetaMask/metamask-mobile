import { renderHook } from '@testing-library/react-native';
import { useAssetsHaveLoaded } from '../../hooks/useAssetsHaveLoaded';
import { useAccountGroupBalanceFetchState } from './useAccountGroupBalanceFetchState';

jest.mock('../../hooks/useAssetsHaveLoaded', () => ({
  useAssetsHaveLoaded: jest.fn(),
}));

describe('useAccountGroupBalanceFetchState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns false while assets have not finished loading for the selected account group', () => {
    jest.mocked(useAssetsHaveLoaded).mockReturnValue(false);

    const { result } = renderHook(() => useAccountGroupBalanceFetchState());

    expect(result.current).toBe(false);
  });

  it('returns true after assets finish loading for the selected account group', () => {
    jest.mocked(useAssetsHaveLoaded).mockReturnValue(true);

    const { result } = renderHook(() => useAccountGroupBalanceFetchState());

    expect(result.current).toBe(true);
  });
});
