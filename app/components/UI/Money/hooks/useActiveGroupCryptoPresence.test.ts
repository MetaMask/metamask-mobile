import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { selectIsAccountGroupFunded } from '../../../../selectors/assets/balances';
import { useAssetsHaveLoaded } from '../../Assets/hooks/useAssetsHaveLoaded';
import { useActiveGroupCryptoPresence } from './useActiveGroupCryptoPresence';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../Assets/hooks/useAssetsHaveLoaded', () => ({
  useAssetsHaveLoaded: jest.fn(),
}));

describe('useActiveGroupCryptoPresence', () => {
  beforeEach(() => {
    jest.mocked(useSelector).mockImplementation((selector) => {
      if (selector === selectIsAccountGroupFunded) {
        return false;
      }
      return undefined;
    });
    jest.mocked(useAssetsHaveLoaded).mockReturnValue(false);
  });

  it('reports loading and unfunded until assets have settled', () => {
    const { result } = renderHook(() => useActiveGroupCryptoPresence());

    expect(result.current).toEqual({ hasCrypto: false, isLoading: true });
  });

  it('reports funded only after the latched load settles with a positive balance', () => {
    jest.mocked(useAssetsHaveLoaded).mockReturnValue(true);
    jest.mocked(useSelector).mockImplementation((selector) => {
      if (selector === selectIsAccountGroupFunded) {
        return true;
      }
      return undefined;
    });

    const { result } = renderHook(() => useActiveGroupCryptoPresence());

    expect(result.current).toEqual({ hasCrypto: true, isLoading: false });
  });

  it('keeps hasCrypto false when settled but balance is zero', () => {
    jest.mocked(useAssetsHaveLoaded).mockReturnValue(true);

    const { result } = renderHook(() => useActiveGroupCryptoPresence());

    expect(result.current).toEqual({ hasCrypto: false, isLoading: false });
  });

  it('does not treat a positive balance as funded while still loading', () => {
    jest.mocked(useSelector).mockImplementation((selector) => {
      if (selector === selectIsAccountGroupFunded) {
        return true;
      }
      return undefined;
    });

    const { result } = renderHook(() => useActiveGroupCryptoPresence());

    expect(result.current).toEqual({ hasCrypto: false, isLoading: true });
  });
});
