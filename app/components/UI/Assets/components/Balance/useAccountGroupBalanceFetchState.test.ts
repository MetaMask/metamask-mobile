import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { selectIsAssetsLoadingForSelectedAccountGroup } from '../../../../../selectors/assets/assets-controller';
import { useAccountGroupBalanceFetchState } from './useAccountGroupBalanceFetchState';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

describe('useAccountGroupBalanceFetchState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns false while assets are loading for the selected account group', () => {
    jest.mocked(useSelector).mockImplementation((selector) => {
      if (selector === selectIsAssetsLoadingForSelectedAccountGroup) {
        return true;
      }
      return undefined;
    });

    const { result } = renderHook(() => useAccountGroupBalanceFetchState());

    expect(result.current).toBe(false);
  });

  it('returns true after assets finish loading for the selected account group', () => {
    jest.mocked(useSelector).mockImplementation((selector) => {
      if (selector === selectIsAssetsLoadingForSelectedAccountGroup) {
        return false;
      }
      return undefined;
    });

    const { result } = renderHook(() => useAccountGroupBalanceFetchState());

    expect(result.current).toBe(true);
  });
});
