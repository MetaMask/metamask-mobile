import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { useCardAuthenticationVerification } from './useCardAuthenticationVerification';
import useThunkDispatch from '../../../hooks/useThunkDispatch';
import { verifyCardAuthentication } from '../../../../core/redux/slices/card';
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

  const setupMocks = (
    userLoggedIn: boolean,
    isBaanxLoginEnabled: boolean,
    isAuthenticated: boolean = false,
  ) => {
    mockUseSelector
      .mockReturnValueOnce(userLoggedIn)
      .mockReturnValueOnce(isAuthenticated);
    mockUseIsBaanxLoginEnabled.mockReturnValue(isBaanxLoginEnabled);
  };

  it('dispatches verification when user is logged in and Baanx login is enabled', () => {
    setupMocks(true, true);

    renderHook(() => useCardAuthenticationVerification());

    expect(mockDispatch).toHaveBeenCalledWith(
      verifyCardAuthentication({
        isBaanxLoginEnabled: true,
      }),
    );
  });

  it('does not dispatch when user is logged in but Baanx login is disabled', () => {
    setupMocks(true, false);

    renderHook(() => useCardAuthenticationVerification());

    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('does not dispatch when user is not logged in', () => {
    setupMocks(false, true);

    renderHook(() => useCardAuthenticationVerification());

    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('does not dispatch when user is not logged in and Baanx login is disabled', () => {
    setupMocks(false, false);

    renderHook(() => useCardAuthenticationVerification());

    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('logs error when dispatch throws Error instance', () => {
    const testError = new Error('Test dispatch error');
    setupMocks(true, true);
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
    setupMocks(true, true);
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
    setupMocks(false, true);
    const { rerender } = renderHook(() => useCardAuthenticationVerification());

    expect(mockDispatch).not.toHaveBeenCalled();

    setupMocks(true, true);
    rerender();

    expect(mockDispatch).toHaveBeenCalledWith(
      verifyCardAuthentication({
        isBaanxLoginEnabled: true,
      }),
    );
  });

  it('dispatches verification when Baanx login becomes enabled', () => {
    setupMocks(true, false);
    const { rerender } = renderHook(() => useCardAuthenticationVerification());

    expect(mockDispatch).not.toHaveBeenCalled();

    setupMocks(true, true);
    rerender();

    expect(mockDispatch).toHaveBeenCalledWith(
      verifyCardAuthentication({
        isBaanxLoginEnabled: true,
      }),
    );
  });

  it('dispatches verification again when isBaanxLoginEnabled flag changes from false to true', () => {
    setupMocks(true, false);
    const { rerender } = renderHook(() => useCardAuthenticationVerification());

    expect(mockDispatch).not.toHaveBeenCalled();

    setupMocks(true, true);
    rerender();

    expect(mockDispatch).toHaveBeenCalledWith(
      verifyCardAuthentication({
        isBaanxLoginEnabled: true,
      }),
    );
    expect(mockDispatch).toHaveBeenCalledTimes(1);
  });
});
