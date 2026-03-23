import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { useCardAuthenticationVerification } from './useCardAuthenticationVerification';
import useThunkDispatch from '../../../hooks/useThunkDispatch';
import {
  resetAuthenticatedData,
  verifyCardAuthentication,
} from '../../../../core/redux/slices/card';
import Logger from '../../../../util/Logger';
import useIsBaanxLoginEnabled from './isBaanxLoginEnabled';

jest.mock('react-redux');
jest.mock('../../../hooks/useThunkDispatch');
jest.mock('../../../../core/redux/slices/card');
jest.mock('../../../../util/Logger');
jest.mock('./isBaanxLoginEnabled');

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseThunkDispatch = useThunkDispatch as jest.MockedFunction<
  typeof useThunkDispatch
>;
const mockLogger = Logger as jest.Mocked<typeof Logger>;
const mockUseIsBaanxLoginEnabled =
  useIsBaanxLoginEnabled as jest.MockedFunction<typeof useIsBaanxLoginEnabled>;

describe('useCardAuthenticationVerification', () => {
  const mockDispatch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseThunkDispatch.mockReturnValue(mockDispatch);
  });

  /**
   * Sets up mocks for the hook's dependencies.
   * useSelector is called 3 times in order: userLoggedIn, isAuthenticated, geolocationLocation
   */
  const setupMocks = ({
    userLoggedIn,
    isBaanxLoginEnabled,
    isAuthenticated = false,
    geolocationLocation = 'UNKNOWN',
  }: {
    userLoggedIn: boolean;
    isBaanxLoginEnabled: boolean;
    isAuthenticated?: boolean;
    geolocationLocation?: string;
  }) => {
    mockUseSelector
      .mockReturnValueOnce(userLoggedIn)
      .mockReturnValueOnce(isAuthenticated)
      .mockReturnValueOnce(geolocationLocation);
    mockUseIsBaanxLoginEnabled.mockReturnValue(isBaanxLoginEnabled);
  };

  it('dispatches verification when user is logged in and Baanx login is enabled', () => {
    setupMocks({ userLoggedIn: true, isBaanxLoginEnabled: true });

    renderHook(() => useCardAuthenticationVerification());

    expect(mockDispatch).toHaveBeenCalledWith(
      verifyCardAuthentication({
        isBaanxLoginEnabled: true,
      }),
    );
  });

  it('does not dispatch when user is logged in but Baanx login is disabled and geo is unknown', () => {
    setupMocks({
      userLoggedIn: true,
      isBaanxLoginEnabled: false,
      geolocationLocation: 'UNKNOWN',
    });

    renderHook(() => useCardAuthenticationVerification());

    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('does not dispatch when user is not logged in', () => {
    setupMocks({ userLoggedIn: false, isBaanxLoginEnabled: true });

    renderHook(() => useCardAuthenticationVerification());

    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('does not dispatch when user is not logged in and Baanx login is disabled', () => {
    setupMocks({ userLoggedIn: false, isBaanxLoginEnabled: false });

    renderHook(() => useCardAuthenticationVerification());

    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('logs error when dispatch throws Error instance', () => {
    const testError = new Error('Test dispatch error');
    setupMocks({ userLoggedIn: true, isBaanxLoginEnabled: true });
    mockDispatch.mockImplementation(() => {
      throw testError;
    });

    renderHook(() => useCardAuthenticationVerification());

    expect(mockLogger.error).toHaveBeenCalledWith(
      testError,
      'useCardAuthenticationVerification::Error verifying authentication',
    );
  });

  it('logs error when dispatch throws non-Error value', () => {
    setupMocks({ userLoggedIn: true, isBaanxLoginEnabled: true });
    mockDispatch.mockImplementation(() => {
      throw 'String error';
    });

    renderHook(() => useCardAuthenticationVerification());

    expect(mockLogger.error).toHaveBeenCalledWith(
      new Error('String error'),
      'useCardAuthenticationVerification::Error verifying authentication',
    );
  });

  it('dispatches verification when user logs in', () => {
    setupMocks({ userLoggedIn: false, isBaanxLoginEnabled: true });
    const { rerender } = renderHook(() => useCardAuthenticationVerification());

    expect(mockDispatch).not.toHaveBeenCalled();

    setupMocks({ userLoggedIn: true, isBaanxLoginEnabled: true });
    rerender();

    expect(mockDispatch).toHaveBeenCalledWith(
      verifyCardAuthentication({
        isBaanxLoginEnabled: true,
      }),
    );
  });

  it('dispatches verification when Baanx login becomes enabled', () => {
    setupMocks({ userLoggedIn: true, isBaanxLoginEnabled: false });
    const { rerender } = renderHook(() => useCardAuthenticationVerification());

    expect(mockDispatch).not.toHaveBeenCalled();

    setupMocks({ userLoggedIn: true, isBaanxLoginEnabled: true });
    rerender();

    expect(mockDispatch).toHaveBeenCalledWith(
      verifyCardAuthentication({
        isBaanxLoginEnabled: true,
      }),
    );
  });

  it('dispatches verification again when isBaanxLoginEnabled flag changes from false to true', () => {
    setupMocks({ userLoggedIn: true, isBaanxLoginEnabled: false });
    const { rerender } = renderHook(() => useCardAuthenticationVerification());

    expect(mockDispatch).not.toHaveBeenCalled();

    setupMocks({ userLoggedIn: true, isBaanxLoginEnabled: true });
    rerender();

    expect(mockDispatch).toHaveBeenCalledWith(
      verifyCardAuthentication({
        isBaanxLoginEnabled: true,
      }),
    );
    expect(mockDispatch).toHaveBeenCalledTimes(1);
  });

  describe('session clearing when isBaanxLoginEnabled is false', () => {
    it('does not reset auth when geolocationLocation is UNKNOWN (transient geo failure)', () => {
      setupMocks({
        userLoggedIn: true,
        isBaanxLoginEnabled: false,
        isAuthenticated: true,
        geolocationLocation: 'UNKNOWN',
      });

      renderHook(() => useCardAuthenticationVerification());

      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('does not reset auth when geolocationLocation is undefined (geo not loaded yet)', () => {
      setupMocks({
        userLoggedIn: true,
        isBaanxLoginEnabled: false,
        isAuthenticated: true,
        geolocationLocation: undefined,
      });

      renderHook(() => useCardAuthenticationVerification());

      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('resets auth when geolocationLocation is resolved and feature is disabled for that region', () => {
      setupMocks({
        userLoggedIn: true,
        isBaanxLoginEnabled: false,
        isAuthenticated: true,
        geolocationLocation: 'FR',
      });

      renderHook(() => useCardAuthenticationVerification());

      expect(mockDispatch).toHaveBeenCalledWith(resetAuthenticatedData());
    });

    it('does not reset auth when user is not authenticated even if geo is resolved', () => {
      setupMocks({
        userLoggedIn: true,
        isBaanxLoginEnabled: false,
        isAuthenticated: false,
        geolocationLocation: 'FR',
      });

      renderHook(() => useCardAuthenticationVerification());

      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('does not reset auth data when isBaanxLoginEnabled flickers due to geo failure', () => {
      // Start with Baanx login enabled and resolved geo — should dispatch verification
      setupMocks({
        userLoggedIn: true,
        isBaanxLoginEnabled: true,
        isAuthenticated: true,
        geolocationLocation: 'US',
      });
      const { rerender } = renderHook(() =>
        useCardAuthenticationVerification(),
      );

      expect(mockDispatch).toHaveBeenCalledTimes(1);
      mockDispatch.mockClear();

      // Simulate geo failure: geoLocation goes back to UNKNOWN, isBaanxLoginEnabled goes false
      // This should NOT dispatch resetAuthenticatedData
      setupMocks({
        userLoggedIn: true,
        isBaanxLoginEnabled: false,
        isAuthenticated: true,
        geolocationLocation: 'UNKNOWN',
      });
      rerender();

      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('resets auth when geo resolves to unsupported country after being unknown', () => {
      // Start with unknown geo — no dispatch
      setupMocks({
        userLoggedIn: true,
        isBaanxLoginEnabled: false,
        isAuthenticated: true,
        geolocationLocation: 'UNKNOWN',
      });
      const { rerender } = renderHook(() =>
        useCardAuthenticationVerification(),
      );

      expect(mockDispatch).not.toHaveBeenCalled();

      // Geo resolves to unsupported country — should now clear session
      setupMocks({
        userLoggedIn: true,
        isBaanxLoginEnabled: false,
        isAuthenticated: true,
        geolocationLocation: 'FR',
      });
      rerender();

      expect(mockDispatch).toHaveBeenCalledWith(resetAuthenticatedData());
    });
  });
});
