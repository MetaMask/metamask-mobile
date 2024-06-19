import { renderHook, act } from '@testing-library/react-hooks';
import { useDispatch, useSelector } from 'react-redux';
import useCreateSession from './useCreateSession';
import {
  disableProfileSyncingRequest,
  performSignInRequest,
} from '../../../actions/notification/pushNotifications';
import { AppDispatch } from '../../../store';

const useDispatchMock = useDispatch as jest.Mock<AppDispatch>;

jest.mock('react-redux', () => ({
  useDispatch: jest.fn(),
  useSelector: jest.fn(),
}));

jest.mock('../../../actions/notification/pushNotifications', () => ({
  disableProfileSyncingRequest: jest.fn(),
  performSignInRequest: jest.fn(),
}));

describe('useCreateSession', () => {
  const dispatch = jest.fn();
  const isSignedIn = false;
  const isProfileSyncingEnabled = true;
  const selectIsSignedInMock = useSelector as jest.Mock;
  const selectIsProfileSyncingEnabledMock = useSelector as jest.Mock;
  const performSignInRequestMock = performSignInRequest as jest.Mock;

  beforeEach(() => {
    useDispatchMock.mockReturnValue(dispatch);
    selectIsSignedInMock.mockReturnValue(isSignedIn);
    selectIsProfileSyncingEnabledMock.mockReturnValue(isProfileSyncingEnabled);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should not perform sign-in if user is already signed in', () => {
    renderHook(() => useCreateSession());
    expect(dispatch).not.toHaveBeenCalledWith(performSignInRequest());
  });

  it('should not perform sign-in if profile syncing is disabled', () => {
    selectIsProfileSyncingEnabledMock.mockReturnValue(false);
    renderHook(() => useCreateSession());
    expect(dispatch).not.toHaveBeenCalledWith(performSignInRequest());
  });

  it('should perform sign-in if user is not signed in and profile syncing is enabled', () => {
    renderHook(() => useCreateSession());
    expect(dispatch).toHaveBeenCalledWith(performSignInRequest());
  });

  it('should disable profile syncing and set error if an error occurs during sign-in', () => {
    const errorMessage = 'Failed to sign in';
    performSignInRequestMock.mockRejectedValue(new Error(errorMessage));
    const { result } = renderHook(() => useCreateSession());
    act(() => {
      result.current.createSession();
    });
    expect(dispatch).toHaveBeenCalledWith(disableProfileSyncingRequest());
    expect(result.current.error).toBe(errorMessage);
  });
});
