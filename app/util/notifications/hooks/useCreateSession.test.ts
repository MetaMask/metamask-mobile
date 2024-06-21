/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-require-imports */
import { renderHook, act } from '@testing-library/react-hooks';
import useCreateSession from './useCreateSession';
import {
  signIn,
  disableProfileSyncing,
} from '../../../actions/notification/pushNotifications';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));
jest.mock(
  '../../../actions/notification/helpers/useThunkNotificationDispatch',
  () => ({
    useThunkNotificationDispatch: jest.fn(),
  }),
);

jest.mock('../../../actions/notification/pushNotifications', () => ({
  signIn: jest.fn(),
  disableProfileSyncing: jest.fn(),
}));

describe('useCreateSession', () => {
  beforeEach(() => {
    jest
      .spyOn(require('react-redux'), 'useDispatch')
      .mockReturnValue(jest.fn());
    jest.spyOn(require('react-redux'), 'useSelector').mockReturnValue(false);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should not initiate session creation if user is already signed in', () => {
    jest.spyOn(require('react-redux'), 'useSelector').mockReturnValue(true);
    const dispatch = jest.fn();
    const { result } = renderHook(() => useCreateSession());

    act(() => {
      result.current.createSession();
    });

    expect(dispatch).not.toHaveBeenCalled();
  });

  it('should not initiate session creation if profile syncing is disabled', () => {
    const { result } = renderHook(() => useCreateSession());
    const dispatch = jest.fn();

    act(() => {
      result.current.createSession();
    });

    expect(dispatch).not.toHaveBeenCalled();
  });

  it('should initiate session creation if profile syncing is enabled', () => {
    jest.spyOn(require('react-redux'), 'useSelector').mockReturnValue(true);
    const dispatch = jest.fn();

    const { result } = renderHook(() => useCreateSession());

    act(() => {
      result.current.createSession();
    });

    expect(dispatch).toHaveBeenCalledWith(signIn());
  });

  it('should disable profile syncing and set error message if sign-in fails', async () => {
    jest.spyOn(require('react-redux'), 'useSelector').mockReturnValue(true);
    const dispatch = jest.fn();
    jest
      .spyOn(require('react-redux'), 'useDispatch')
      .mockReturnValue(
        jest.fn().mockRejectedValueOnce(new Error('Sign-in failed')),
      );

    const { result, waitForNextUpdate } = renderHook(() => useCreateSession());

    act(() => {
      result.current.createSession();
    });

    await waitForNextUpdate();

    expect(dispatch).toHaveBeenCalledWith(disableProfileSyncing());
    expect(result.current.error).toBe('Sign-in failed');
  });
});
