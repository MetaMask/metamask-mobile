/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-require-imports */
import { renderHook, act } from '@testing-library/react-hooks';
import {
  useListNotifications,
  useCreateNotifications,
  useEnableNotifications,
  useDisableNotifications,
  useMarkNotificationAsRead,
} from './useNotifications';
import {
  fetchAndUpdateMetamaskNotifications,
  updateOnChainTriggersByAccount,
  enableNotificationServices,
  disableNotificationServices,
  markMetamaskNotificationsAsRead,
  setMetamaskNotificationsFeatureSeen,
} from '../../../actions/notification/pushNotifications';
import { TRIGGER_TYPES } from '../constants';
import { MarkAsReadNotificationsParam } from '../types';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));
jest.mock(
  '../../../actions/notification/helpers/useThunkNotificationDispatch',
  () => ({
    useThunkNotificationDispatch: jest.fn(),
  }),
);
jest.mock('../../../selectors/pushNotifications', () => ({
  selectNotificationsList: jest.fn(),
  selectIsMetamaskNotificationsEnabled: jest.fn(),
}));
jest.mock('../../../util/errorHandling', () => ({
  getErrorMessage: jest.fn(),
}));
describe('useListNotifications', () => {
  it('should fetch and update the list of notifications', async () => {
    const dispatch = jest.fn();
    const notifications = [
      { id: 1, message: 'Notification 1' },
      { id: 2, message: 'Notification 2' },
    ];
    const errorMessage = null;

    jest
      .spyOn(require('react-redux'), 'useSelector')
      .mockReturnValue(notifications);
    jest
      .spyOn(
        require('../../../actions/notification/helpers/useThunkNotificationDispatch'),
        'useThunkNotificationDispatch',
      )
      .mockReturnValue(dispatch);
    jest
      .spyOn(
        require('../../../actions/notification/pushNotifications'),
        'fetchAndUpdateMetamaskNotifications',
      )
      .mockResolvedValue(errorMessage);

    const { result, waitForNextUpdate } = renderHook(() =>
      useListNotifications(),
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeUndefined();
    expect(result.current.notificationsData).toEqual(notifications);

    act(() => {
      result.current.listNotifications();
    });

    expect(result.current.isLoading).toBe(true);

    await waitForNextUpdate();

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeUndefined();
    expect(dispatch).toHaveBeenCalledWith(
      fetchAndUpdateMetamaskNotifications(),
    );
  });
});
describe('useCreateNotifications', () => {
  it('should create on-chain triggers for notifications', async () => {
    const dispatch = jest.fn();
    const accounts = ['account1', 'account2'];
    const errorMessage = null;

    jest
      .spyOn(
        require('../../../actions/notification/helpers/useThunkNotificationDispatch'),
        'useThunkNotificationDispatch',
      )
      .mockReturnValue(dispatch);
    jest
      .spyOn(
        require('../../../actions/notification/pushNotifications'),
        'updateOnChainTriggersByAccount',
      )
      .mockResolvedValue(errorMessage);
    jest
      .spyOn(
        require('../../../actions/notification/pushNotifications'),
        'setMetamaskNotificationsFeatureSeen',
      )
      .mockResolvedValue(undefined);

    const { result, waitForNextUpdate } = renderHook(() =>
      useCreateNotifications(),
    );

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeUndefined();

    act(() => {
      result.current.createNotifications(accounts);
    });

    expect(result.current.loading).toBe(true);

    await waitForNextUpdate();

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeUndefined();
    expect(dispatch).toHaveBeenCalledWith(
      updateOnChainTriggersByAccount(accounts),
    );
    expect(dispatch).toHaveBeenCalledWith(
      setMetamaskNotificationsFeatureSeen(),
    );
  });
});
describe('useEnableNotifications', () => {
  it('should enable MetaMask notifications', async () => {
    const dispatch = jest.fn();
    const isMetamaskNotificationsEnabled = true;
    const errorMessage = null;

    jest
      .spyOn(require('react-redux'), 'useSelector')
      .mockReturnValue(isMetamaskNotificationsEnabled);
    jest
      .spyOn(
        require('../../../actions/notification/helpers/useThunkNotificationDispatch'),
        'useThunkNotificationDispatch',
      )
      .mockReturnValue(dispatch);
    jest
      .spyOn(
        require('../../../actions/notification/pushNotifications'),
        'enableNotificationServices',
      )
      .mockResolvedValue(errorMessage);
    jest
      .spyOn(
        require('../../../actions/notification/pushNotifications'),
        'setMetamaskNotificationsFeatureSeen',
      )
      .mockResolvedValue(undefined);

    const { result, waitForNextUpdate } = renderHook(() =>
      useEnableNotifications(),
    );

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeUndefined();

    act(() => {
      result.current.enableNotifications();
    });

    expect(result.current.loading).toBe(true);

    await waitForNextUpdate();

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeUndefined();
    expect(dispatch).toHaveBeenCalledWith(enableNotificationServices());
    expect(dispatch).toHaveBeenCalledWith(
      setMetamaskNotificationsFeatureSeen(),
    );
  });
});
describe('useDisableNotifications', () => {
  it('should disable notifications', async () => {
    const dispatch = jest.fn();
    const isMetamaskNotificationsEnabled = true;
    const errorMessage = null;

    jest
      .spyOn(require('react-redux'), 'useSelector')
      .mockReturnValue(isMetamaskNotificationsEnabled);
    jest
      .spyOn(
        require('../../../actions/notification/helpers/useThunkNotificationDispatch'),
        'useThunkNotificationDispatch',
      )
      .mockReturnValue(dispatch);
    jest
      .spyOn(
        require('../../../actions/notification/pushNotifications'),
        'disableNotificationServices',
      )
      .mockResolvedValue(errorMessage);

    const { result, waitForNextUpdate } = renderHook(() =>
      useDisableNotifications(),
    );

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeUndefined();

    act(() => {
      result.current.disableNotifications();
    });

    expect(result.current.loading).toBe(true);

    await waitForNextUpdate();

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeUndefined();
    expect(dispatch).toHaveBeenCalledWith(disableNotificationServices());
  });
});
describe('useMarkNotificationAsRead', () => {
  it('should mark specific notifications as read', async () => {
    const dispatch = jest.fn();
    const notifications: MarkAsReadNotificationsParam[] = [
      //@ts-expect-error incorrect type
      { id: '1', type: TRIGGER_TYPES.FEATURES_ANNOUNCEMENT, isRead: true },
      //@ts-expect-error incorrect type
      { id: '2', type: TRIGGER_TYPES.ETH_SENT, isRead: true },
    ];
    const errorMessage = null;

    jest
      .spyOn(
        require('../../../actions/notification/helpers/useThunkNotificationDispatch'),
        'useThunkNotificationDispatch',
      )
      .mockReturnValue(dispatch);
    jest
      .spyOn(
        require('../../../actions/notification/pushNotifications'),
        'markMetamaskNotificationsAsRead',
      )
      .mockResolvedValue(errorMessage);

    const { result, waitForNextUpdate } = renderHook(() =>
      useMarkNotificationAsRead(),
    );

    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBeUndefined();

    act(() => {
      result.current.markNotificationAsRead(notifications);
    });

    expect(result.current.loading).toBe(true);

    await waitForNextUpdate();

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeUndefined();
    expect(dispatch).toHaveBeenCalledWith(
      markMetamaskNotificationsAsRead(notifications),
    );
  });
});
