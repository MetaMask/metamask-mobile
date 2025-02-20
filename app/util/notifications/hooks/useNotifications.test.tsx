import { act } from '@testing-library/react-hooks';
import { waitFor } from '@testing-library/react-native';

// eslint-disable-next-line import/no-namespace
import * as Actions from '../../../actions/notification/helpers';
import {
  createMockNotificationEthReceived,
  createMockNotificationEthSent,
} from '../../../components/UI/Notification/__mocks__/mock_notifications';
// eslint-disable-next-line import/no-namespace
import * as Selectors from '../../../selectors/notifications';
import { renderHookWithProvider } from '../../test/renderWithProvider';
import {
  useDisableNotifications,
  useEnableNotifications,
  useListNotifications,
  useMarkNotificationAsRead,
  useResetNotifications,
} from './useNotifications';
// eslint-disable-next-line import/no-namespace
import * as UsePushNotifications from './usePushNotifications';

jest.mock('../constants', () => ({
  isNotificationsFeatureEnabled: () => true,
}));

describe('useNotifications - useListNotifications()', () => {
  const arrangeMocks = () => {
    const mockFetchNotifications = jest.spyOn(Actions, 'fetchNotifications');
    const mockSelectLoading = jest.spyOn(
      Selectors,
      'selectIsFetchingMetamaskNotifications',
    );
    const mockSelectData = jest.spyOn(Selectors, 'getNotificationsList');

    return {
      mockFetchNotifications,
      mockSelectLoading,
      mockSelectData,
    };
  };

  type Mocks = ReturnType<typeof arrangeMocks>;
  const arrangeAct = async (mutateMocks?: (mocks: Mocks) => void) => {
    // Arrange
    const mocks = arrangeMocks();
    mutateMocks?.(mocks);

    // Act
    const hook = renderHookWithProvider(() => useListNotifications());
    await act(() => hook.result.current.listNotifications());
    await waitFor(() =>
      expect(mocks.mockFetchNotifications).toHaveBeenCalled(),
    );

    return { mocks, hook };
  };

  it('successfully invokes action', async () => {
    const { mocks } = await arrangeAct();
    expect(mocks.mockSelectLoading).toHaveBeenCalled();
    expect(mocks.mockSelectData).toHaveBeenCalled();
  });

  it('creates an error when fails', async () => {
    const { hook } = await arrangeAct((m) => {
      m.mockFetchNotifications.mockRejectedValue(new Error('Test Error'));
    });

    expect(hook.result.current.error).toBeDefined();
  });
});

describe('useNotifications - useEnableNotifications()', () => {
  const arrangeMocks = () => {
    const mockTogglePushNotification = jest.fn().mockResolvedValue(true);
    const mockUsePushNotificationsToggle = jest
      .spyOn(UsePushNotifications, 'usePushNotificationsToggle')
      .mockReturnValue({
        data: true,
        loading: false,
        togglePushNotification: mockTogglePushNotification,
      });
    const mockEnableNotifications = jest.spyOn(Actions, 'enableNotifications');
    const mockSelectLoading = jest.spyOn(
      Selectors,
      'selectIsUpdatingMetamaskNotifications',
    );
    const mockSelectData = jest.spyOn(
      Selectors,
      'selectIsMetamaskNotificationsEnabled',
    );

    return {
      mockTogglePushNotification,
      mockUsePushNotificationsToggle,
      mockEnableNotifications,
      mockSelectLoading,
      mockSelectData,
    };
  };

  type Mocks = ReturnType<typeof arrangeMocks>;
  const arrangeAct = async (mutateMocks?: (mocks: Mocks) => void) => {
    // Arrange
    const mocks = arrangeMocks();
    mutateMocks?.(mocks);

    // Act
    const hook = renderHookWithProvider(() => useEnableNotifications());
    await act(() => hook.result.current.enableNotifications());
    await waitFor(() =>
      expect(mocks.mockEnableNotifications).toHaveBeenCalled(),
    );

    return { mocks, hook };
  };

  it('successfully invokes action', async () => {
    const { mocks } = await arrangeAct();
    expect(mocks.mockUsePushNotificationsToggle).toHaveBeenCalled();
    expect(mocks.mockTogglePushNotification).toHaveBeenCalled();
    expect(mocks.mockSelectLoading).toHaveBeenCalled();
    expect(mocks.mockSelectData).toHaveBeenCalled();
  });

  it('creates an error when fails', async () => {
    const { hook } = await arrangeAct((m) => {
      m.mockEnableNotifications.mockRejectedValue(new Error('Test Error'));
    });

    expect(hook.result.current.error).toBeDefined();
  });
});

describe('useNotifications - useDisableNotifications()', () => {
  const arrangeMocks = () => {
    const mockTogglePushNotification = jest.fn().mockResolvedValue(true);
    const mockUsePushNotificationsToggle = jest
      .spyOn(UsePushNotifications, 'usePushNotificationsToggle')
      .mockReturnValue({
        data: true,
        loading: false,
        togglePushNotification: mockTogglePushNotification,
      });
    const mockDisableNotifications = jest.spyOn(
      Actions,
      'disableNotifications',
    );
    const mockSelectLoading = jest.spyOn(
      Selectors,
      'selectIsUpdatingMetamaskNotifications',
    );
    const mockSelectData = jest.spyOn(
      Selectors,
      'selectIsMetamaskNotificationsEnabled',
    );

    return {
      mockTogglePushNotification,
      mockUsePushNotificationsToggle,
      mockDisableNotifications,
      mockSelectLoading,
      mockSelectData,
    };
  };

  type Mocks = ReturnType<typeof arrangeMocks>;
  const arrangeAct = async (mutateMocks?: (mocks: Mocks) => void) => {
    // Arrange
    const mocks = arrangeMocks();
    mutateMocks?.(mocks);

    // Act
    const hook = renderHookWithProvider(() => useDisableNotifications());
    await act(() => hook.result.current.disableNotifications());
    await waitFor(() =>
      expect(mocks.mockDisableNotifications).toHaveBeenCalled(),
    );

    return { mocks, hook };
  };

  it('successfully invokes action', async () => {
    const { mocks } = await arrangeAct();
    expect(mocks.mockUsePushNotificationsToggle).toHaveBeenCalled();
    expect(mocks.mockTogglePushNotification).toHaveBeenCalled();
    expect(mocks.mockSelectLoading).toHaveBeenCalled();
    expect(mocks.mockSelectData).toHaveBeenCalled();
  });

  it('creates an error when fails', async () => {
    const { hook } = await arrangeAct((m) => {
      m.mockDisableNotifications.mockRejectedValue(new Error('Test Error'));
    });

    expect(hook.result.current.error).toBeDefined();
  });
});

describe('useNotifications - useMarkNotificationAsRead()', () => {
  const arrangeMocks = () => {
    const mockMarkNotificationsAsRead = jest
      .spyOn(Actions, 'markNotificationsAsRead')
      .mockImplementation(jest.fn());
    const mockData = [
      createMockNotificationEthSent(),
      createMockNotificationEthReceived(),
    ];
    return {
      mockMarkNotificationsAsRead,
      mockData,
    };
  };

  it('successfully invokes action', async () => {
    // Arrange
    const mocks = arrangeMocks();

    // Act
    const hook = renderHookWithProvider(() => useMarkNotificationAsRead());
    await act(() => hook.result.current.markNotificationAsRead(mocks.mockData));

    // Assert
    await waitFor(() =>
      expect(mocks.mockMarkNotificationsAsRead).toHaveBeenCalled(),
    );
  });
});

describe('useNotifications - useResetNotifications()', () => {
  const arrangeMocks = () => {
    const mockSelectLoading = jest
      .spyOn(Selectors, 'selectIsUpdatingMetamaskNotifications')
      .mockReturnValue(false);
    const mockResetNotifications = jest.spyOn(Actions, 'resetNotifications');
    return {
      mockSelectLoading,
      mockResetNotifications,
    };
  };

  type Mocks = ReturnType<typeof arrangeMocks>;
  const arrangeAct = async (mutateMocks?: (mocks: Mocks) => void) => {
    // Arrange
    const mocks = arrangeMocks();
    mutateMocks?.(mocks);

    // Act
    const hook = renderHookWithProvider(() => useResetNotifications());
    await act(() => hook.result.current.resetNotifications());
    await waitFor(() =>
      expect(mocks.mockResetNotifications).toHaveBeenCalled(),
    );

    return { mocks, hook };
  };

  it('successfully invokes action', async () => {
    const { mocks } = await arrangeAct();
    expect(mocks.mockSelectLoading).toHaveBeenCalled();
  });

  it('creates an error when fails', async () => {
    const { hook } = await arrangeAct((m) => {
      m.mockResetNotifications.mockRejectedValue(new Error('Test Error'));
    });

    expect(hook.result.current.error).toBeDefined();
  });
});
