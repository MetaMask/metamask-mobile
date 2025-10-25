import { renderHook } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { useCardAuthenticationVerification } from './useCardAuthenticationVerification';
import useThunkDispatch from '../../../hooks/useThunkDispatch';
import { verifyCardAuthentication } from '../../../../core/redux/slices/card';
import Logger from '../../../../util/Logger';

jest.mock('react-redux');
jest.mock('../../../hooks/useThunkDispatch');
jest.mock('../../../../core/redux/slices/card');
jest.mock('../../../../util/Logger');

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const mockUseThunkDispatch = useThunkDispatch as jest.MockedFunction<
  typeof useThunkDispatch
>;
const mockLogger = Logger as jest.Mocked<typeof Logger>;

describe('useCardAuthenticationVerification', () => {
  const mockDispatch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseThunkDispatch.mockReturnValue(mockDispatch);
    mockUseSelector.mockReturnValue(true);
  });

  it('dispatches verification when user is logged in and card feature is enabled', () => {
    renderHook(() => useCardAuthenticationVerification());

    expect(mockDispatch).toHaveBeenCalledWith(
      verifyCardAuthentication({
        isBaanxLoginEnabled: true,
      }),
    );
  });

  it('does not dispatch when dispatch is not available', () => {
    renderHook(() => useCardAuthenticationVerification());

    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('logs error when dispatch throws Error instance', () => {
    const testError = new Error('Test dispatch error');
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
    const { rerender } = renderHook(() => useCardAuthenticationVerification());

    expect(mockDispatch).not.toHaveBeenCalled();

    mockUseSelector.mockReturnValue(true);
    rerender();

    expect(mockDispatch).toHaveBeenCalledWith(
      verifyCardAuthentication({
        isBaanxLoginEnabled: true,
      }),
    );
  });

  it('calls dispatch when component rerenders', () => {
    const { rerender } = renderHook(() => useCardAuthenticationVerification());
    rerender();

    expect(mockDispatch).toHaveBeenCalledWith(
      verifyCardAuthentication({
        isBaanxLoginEnabled: true,
      }),
    );
    expect(mockDispatch).toHaveBeenCalledTimes(1);
  });
});
