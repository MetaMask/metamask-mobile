// NavigationProvider.test.tsx
import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import {
  selectAppServicesReady,
  selectUserLoggedIn,
  selectUserState,
} from './selectors';

// Mock the redux store state
const mockState = {
  user: {
    appServicesReady: false,
    userLoggedIn: true,
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
});
