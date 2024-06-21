/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-require-imports */
import { renderHook, act } from '@testing-library/react-hooks';
import {
  useEnableProfileSyncing,
  useDisableProfileSyncing,
} from './useProfileSyncing';
import {
  enableProfileSyncing,
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
  enableProfileSyncing: jest.fn(),
  disableProfileSyncing: jest.fn(),
}));

describe('useEnableProfileSyncing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should enable profile syncing and return loading as false and error as undefined', async () => {
    const dispatch = jest.fn();

    const { result, waitForNextUpdate } = renderHook(() =>
      useEnableProfileSyncing(),
    );

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeUndefined();

    act(() => {
      result.current.enableProfileSyncing();
    });

    expect(result.current.loading).toBe(true);

    await waitForNextUpdate();

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeUndefined();
    expect(dispatch).toHaveBeenCalledWith(enableProfileSyncing());
  });

  it('should set error message when enableProfileSyncingAction returns an error', async () => {
    const dispatch = jest.fn();

    jest
      .spyOn(require('react-redux'), 'useDispatch')
      .mockReturnValue(
        jest
          .fn()
          .mockRejectedValueOnce(new Error('Failed to enable profile syncing')),
      );

    const { result, waitForNextUpdate } = renderHook(() =>
      useEnableProfileSyncing(),
    );

    act(() => {
      result.current.enableProfileSyncing();
    });

    await waitForNextUpdate();

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('Failed to enable profile syncing');
    expect(dispatch).toHaveBeenCalledWith(enableProfileSyncing());
    expect(result.current.error).toBe('Sign-in failed');
  });

  it('should set error message when an error occurs during enableProfileSyncing', async () => {
    const dispatch = jest.fn();

    jest
      .spyOn(require('react-redux'), 'useDispatch')
      .mockReturnValue(
        jest.fn().mockRejectedValueOnce(new Error('An error occurred')),
      );

    const { result, waitForNextUpdate } = renderHook(() =>
      useEnableProfileSyncing(),
    );

    act(() => {
      result.current.enableProfileSyncing();
    });

    await waitForNextUpdate();

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('An error occurred');
    expect(dispatch).toHaveBeenCalledWith(enableProfileSyncing());
  });
});

describe('useDisableProfileSyncing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should disable profile syncing and return loading as false and error as undefined', async () => {
    const dispatch = jest.fn();

    jest.spyOn(require('react-redux'), 'useDispatch');

    const { result, waitForNextUpdate } = renderHook(() =>
      useDisableProfileSyncing(),
    );

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeUndefined();

    act(() => {
      result.current.disableProfileSyncing();
    });

    expect(result.current.loading).toBe(true);

    await waitForNextUpdate();

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeUndefined();
    expect(dispatch).toHaveBeenCalledWith(disableProfileSyncing());
  });

  it('should set error message when disableProfileSyncingAction returns an error', async () => {
    const dispatch = jest.fn();

    jest
      .spyOn(require('react-redux'), 'useDispatch')
      .mockReturnValue(
        jest
          .fn()
          .mockRejectedValueOnce(
            new Error('Failed to disable profile syncing'),
          ),
      );

    const { result, waitForNextUpdate } = renderHook(() =>
      useDisableProfileSyncing(),
    );

    act(() => {
      result.current.disableProfileSyncing();
    });

    await waitForNextUpdate();

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('Failed to disable profile syncing');
    expect(dispatch).toHaveBeenCalledWith(disableProfileSyncing());
  });

  it('should set error message when an error occurs during disableProfileSyncing', async () => {
    const dispatch = jest.fn();

    jest
      .spyOn(require('react-redux'), 'useDispatch')
      .mockReturnValue(
        jest.fn().mockRejectedValueOnce(new Error('An error occurred')),
      );

    const { result, waitForNextUpdate } = renderHook(() =>
      useDisableProfileSyncing(),
    );

    act(() => {
      result.current.disableProfileSyncing();
    });

    await waitForNextUpdate();

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('An error occurred');
    expect(dispatch).toHaveBeenCalledWith(disableProfileSyncing());
  });
});
