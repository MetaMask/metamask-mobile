import { act } from '@testing-library/react-hooks';
import { waitFor } from '@testing-library/react-native';
// eslint-disable-next-line import-x/no-namespace
import * as Actions from '../../../actions/notification/helpers';
// eslint-disable-next-line import-x/no-namespace
import * as Selectors from '../../../selectors/notifications';
import { renderHookWithProvider } from '../../test/renderWithProvider';
// eslint-disable-next-line import-x/no-namespace
import * as NotificationServiceModule from '../services/NotificationService';
import {
  usePushNotificationsToggle,
  UsePushNotificationsToggleProps,
} from './usePushNotifications';

jest.mock('../constants', () => ({
  isNotificationsFeatureEnabled: () => true,
}));

describe('useNotifications - usePushNotificationsToggle()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const arrangeMocks = () => {
    const mockSelectEnabled = jest.spyOn(
      Selectors,
      'selectIsMetaMaskPushNotificationsEnabled',
    );
    const mockRequestPermission = jest.spyOn(
      NotificationServiceModule,
      'requestPushPermissions',
    );
    const mockHasPermission = jest.spyOn(
      NotificationServiceModule,
      'hasPushPermission',
    );
    const mockEnablePushNotifications = jest.spyOn(
      Actions,
      'enablePushNotifications',
    );
    const mockDisablePushNotifications = jest.spyOn(
      Actions,
      'disablePushNotifications',
    );

    mockRequestPermission.mockResolvedValue(true);
    mockHasPermission.mockResolvedValue(true);
    mockEnablePushNotifications.mockResolvedValue(undefined);
    mockDisablePushNotifications.mockResolvedValue(undefined);

    return {
      mockSelectEnabled,
      mockRequestPermission,
      mockHasPermission,
      mockEnablePushNotifications,
      mockDisablePushNotifications,
    };
  };

  type Mocks = ReturnType<typeof arrangeMocks>;
  const arrangeActEnableFlow = async (
    overrideMocks?: (mocks: Mocks) => void,
    state?: UsePushNotificationsToggleProps,
  ) => {
    // Arrange
    const mocks = arrangeMocks();
    overrideMocks?.(mocks);

    // Act
    const hook = renderHookWithProvider(() =>
      usePushNotificationsToggle(state),
    );
    let toggleResult: boolean | undefined;
    await act(async () => {
      toggleResult = await hook.result.current.togglePushNotification(true);
    });

    return { mocks, hook, toggleResult };
  };

  it('enable push notifications successfully', async () => {
    const { mocks, toggleResult } = await arrangeActEnableFlow();
    await waitFor(() => expect(mocks.mockRequestPermission).toHaveBeenCalled());
    await waitFor(() =>
      expect(mocks.mockEnablePushNotifications).toHaveBeenCalled(),
    );
    expect(toggleResult).toBe(true);
    expect(mocks.mockSelectEnabled).toHaveBeenCalled();
    expect(mocks.mockDisablePushNotifications).not.toHaveBeenCalled();
  });

  it('enable push notifications bails if fails to request push permissions', async () => {
    const { mocks, toggleResult } = await arrangeActEnableFlow((m) =>
      m.mockRequestPermission.mockRejectedValue(new Error('TEST ERROR')),
    );
    await waitFor(() => expect(mocks.mockRequestPermission).toHaveBeenCalled());
    await waitFor(() =>
      expect(mocks.mockEnablePushNotifications).not.toHaveBeenCalled(),
    );
    expect(toggleResult).toBe(false);
  });

  it('silently fails if enable push notifications action fails', async () => {
    const { mocks, toggleResult } = await arrangeActEnableFlow((m) =>
      m.mockEnablePushNotifications.mockRejectedValue(new Error('TEST ERROR')),
    );
    await waitFor(() => expect(mocks.mockRequestPermission).toHaveBeenCalled());
    await waitFor(() =>
      expect(mocks.mockEnablePushNotifications).toHaveBeenCalled(),
    );
    expect(toggleResult).toBe(false);
  });

  it('does not nudge for push notifications enablement', async () => {
    const { mocks, toggleResult } = await arrangeActEnableFlow(undefined, {
      nudgeEnablePush: false,
    });
    await waitFor(() => expect(mocks.mockHasPermission).toHaveBeenCalled());
    await waitFor(() =>
      expect(mocks.mockEnablePushNotifications).toHaveBeenCalled(),
    );
    expect(toggleResult).toBe(true);
  });

  const arrangeActDisableFlow = async (
    overrideMocks?: (mocks: Mocks) => void,
  ) => {
    // Arrange
    const mocks = arrangeMocks();
    overrideMocks?.(mocks);

    // Act
    const hook = renderHookWithProvider(() => usePushNotificationsToggle());
    let toggleResult: boolean | undefined;
    await act(async () => {
      toggleResult = await hook.result.current.togglePushNotification(false);
    });

    return { mocks, hook, toggleResult };
  };

  it('disable push notifications successfully', async () => {
    const { mocks, toggleResult } = await arrangeActDisableFlow();
    await waitFor(() =>
      expect(mocks.mockDisablePushNotifications).toHaveBeenCalled(),
    );
    expect(toggleResult).toBe(true);
    expect(mocks.mockSelectEnabled).toHaveBeenCalled();
    expect(mocks.mockEnablePushNotifications).not.toHaveBeenCalled();
    expect(mocks.mockRequestPermission).not.toHaveBeenCalled();
  });

  it('silently fails if disable push notifications action fails', async () => {
    const { mocks, toggleResult } = await arrangeActDisableFlow((m) =>
      m.mockDisablePushNotifications.mockRejectedValue(new Error('TEST ERROR')),
    );
    await waitFor(() =>
      expect(mocks.mockDisablePushNotifications).toHaveBeenCalled(),
    );
    expect(toggleResult).toBe(false);
  });
});
