// NavigationProvider.test.tsx
import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import {
  selectAppServicesReady,
  selectIsConnectionRemoved,
  selectUserLoggedIn,
  selectUserState,
  selectMusdConversionEducationSeen,
} from './selectors';

// Mock the redux store state
const mockState = {
  user: {
    appServicesReady: false,
    userLoggedIn: true,
    isConnectionRemoved: false,
    musdConversionEducationSeen: false,
  },
};

// Mock react-redux
jest.mock('react-redux', () => ({
  useSelector: jest.fn((selector) => selector(mockState)),
}));

describe('user state selectors', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('selectUserState', () => {
    it('should return the entire user state', () => {
      const { result } = renderHook(() => useSelector(selectUserState));
      expect(result.current).toEqual(mockState.user);
    });
  });

  describe('selectAppServicesReady', () => {
    it('should return false when services are not ready', () => {
      const { result } = renderHook(() => useSelector(selectAppServicesReady));
      expect(result.current).toBe(false);
    });
  });

  describe('selectUserLoggedIn', () => {
    it('should return true when user is logged in', () => {
      const { result } = renderHook(() => useSelector(selectUserLoggedIn));
      expect(result.current).toBe(true);
    });
  });

  describe('selectIsConnectionRemoved', () => {
    it('should return false when user change password less than 20 times', () => {
      const { result } = renderHook(() =>
        useSelector(selectIsConnectionRemoved),
      );
      expect(result.current).toBe(false);
    });

    it('should return true when user change password more than 20 times', () => {
      mockState.user.isConnectionRemoved = true;
      const { result } = renderHook(() =>
        useSelector(selectIsConnectionRemoved),
      );
      expect(result.current).toBe(true);
    });
  });

  describe('selectMusdConversionEducationSeen', () => {
    it('returns false when the user has not seen the mUSD conversion education screen', () => {
      mockState.user.musdConversionEducationSeen = false;

      const { result } = renderHook(() =>
        useSelector(selectMusdConversionEducationSeen),
      );

      expect(result.current).toBe(false);
    });

    it('returns true when the user has already seen the mUSD conversion education screen', () => {
      mockState.user.musdConversionEducationSeen = true;

      const { result } = renderHook(() =>
        useSelector(selectMusdConversionEducationSeen),
      );

      expect(result.current).toBe(true);
    });
  });
});
