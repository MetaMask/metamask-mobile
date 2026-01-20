import { renderHook, act } from '@testing-library/react-hooks';
import { NavigationProp } from '@react-navigation/native';
import { RootParamList } from '../../../../types/navigation';
import {
  useHandleOptInCancel,
  useHandleOptInClick,
  useOptimisticNavigationEffect,
} from './OptIn.hooks';
import Routes from '../../../../constants/navigation/Routes';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import { IUseMetricsHook, MetaMetricsEvents } from '../../../hooks/useMetrics';
// eslint-disable-next-line import/no-namespace
import * as Selectors from '../../../../selectors/identity';

describe('useOptimisticNavigationEffect', () => {
  jest.useFakeTimers();

  const arrange = (isCreatingNotifications: boolean) => {
    const mockNavigate = jest.fn();
    const mockNavigation = {
      navigate: mockNavigate,
    } as unknown as NavigationProp<RootParamList>;

    const hook = renderHook(
      (props: { isCreatingNotifications: boolean }) =>
        useOptimisticNavigationEffect({
          isCreatingNotifications: props.isCreatingNotifications,
          navigation: mockNavigation,
        }),
      { initialProps: { isCreatingNotifications } },
    );

    return { hook, mockNavigate, mockNavigation };
  };

  it('sets optimisticLoading to true when isCreatingNotifications is true', () => {
    const { hook } = arrange(true);
    expect(hook.result.current).toBe(true);
  });

  it('sets optimisticLoading to false when isCreatingNotifications is false', () => {
    const { hook } = arrange(false);
    expect(hook.result.current).toBe(false);
  });

  it('navigates to notification list page after timeout', () => {
    const { hook, mockNavigate } = arrange(true);

    // Assert - We are optimistically loading
    expect(hook.result.current).toBe(true);

    act(() => jest.advanceTimersByTime(5000));

    // Assert - We have stopped optimistically loading
    expect(mockNavigate).toHaveBeenCalledWith(Routes.NOTIFICATIONS.VIEW);
    expect(hook.result.current).toBe(false);
  });

  it('clears timeout when isCreatingNotifications changes to false', () => {
    const { hook, mockNavigate } = arrange(true);

    act(() =>
      hook.rerender({
        isCreatingNotifications: false,
      }),
    );

    act(() => jest.advanceTimersByTime(5000));

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(hook.result.current).toBe(false);
  });

  it('clears timeout on unmount', () => {
    const { hook, mockNavigate } = arrange(true);

    act(() => hook.unmount());

    act(() => jest.advanceTimersByTime(5000));

    expect(mockNavigate).not.toHaveBeenCalled();
  });
});

describe('useHandleOptInClick', () => {
  const arrange = (props = { basicFunctionalityEnabled: true }) => {
    // Mock Navigation
    const mockNavigate = jest.fn();
    const mockNavigation = {
      navigate: mockNavigate,
    } as unknown as NavigationProp<RootParamList>;

    // Mock Metrics
    const mockTrackEvent = jest.fn();
    const mockCreateEventBuilder = jest.fn().mockReturnValue({
      addProperties: jest.fn().mockReturnThis(),
      build: jest.fn().mockReturnValue({}),
    });
    const mockMetrics = {
      trackEvent: mockTrackEvent,
      createEventBuilder: mockCreateEventBuilder,
    } as unknown as IUseMetricsHook;

    const mockEnableNotifications = jest.fn().mockImplementation(jest.fn());

    const mockSelectIsBackupAndSyncEnabled = jest.spyOn(
      Selectors,
      'selectIsBackupAndSyncEnabled',
    );

    const hook = renderHookWithProvider(
      () =>
        useHandleOptInClick({
          navigation: mockNavigation,
          metrics: mockMetrics,
          enableNotifications: mockEnableNotifications,
        }),
      {
        state: {
          settings: {
            basicFunctionalityEnabled: props.basicFunctionalityEnabled,
          },
        },
      },
    );

    return {
      hook,
      mockNavigate,
      mockTrackEvent,
      mockCreateEventBuilder,
      mockEnableNotifications,
      mockSelectIsBackupAndSyncEnabled,
    };
  };

  it('navigates to Basic Functionality if not enabled', async () => {
    const { hook, mockNavigate } = arrange({
      basicFunctionalityEnabled: false,
    });

    await hook.result.current();

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.BASIC_FUNCTIONALITY,
      params: {
        caller: Routes.NOTIFICATIONS.OPT_IN,
      },
    });
  });

  it('enables notifications and tracks event if Basic Functionality is enabled', async () => {
    const {
      hook,
      mockTrackEvent,
      mockCreateEventBuilder,
      mockEnableNotifications,
    } = arrange({ basicFunctionalityEnabled: true });

    await hook.result.current();

    expect(mockEnableNotifications).toHaveBeenCalled();
    expect(mockTrackEvent).toHaveBeenCalledWith(
      mockCreateEventBuilder(MetaMetricsEvents.NOTIFICATIONS_ACTIVATED)
        .addProperties({
          action_type: 'completed',
          is_profile_syncing_enabled: true,
        })
        .build(),
    );
  });
});

describe('useHandleOptInCancel', () => {
  const arrange = (props = { isCreatingNotifications: true }) => {
    // Mock Navigation
    const mockNavigate = jest.fn();
    const mockNavigation = {
      navigate: mockNavigate,
    } as unknown as NavigationProp<RootParamList>;

    // Mock Metrics
    const mockTrackEvent = jest.fn();
    const mockCreateEventBuilder = jest.fn().mockReturnValue({
      addProperties: jest.fn().mockReturnThis(),
      build: jest.fn().mockReturnValue({}),
    });
    const mockMetrics = {
      trackEvent: mockTrackEvent,
      createEventBuilder: mockCreateEventBuilder,
    } as unknown as IUseMetricsHook;

    const mockSelectIsBackupAndSyncEnabled = jest.spyOn(
      Selectors,
      'selectIsBackupAndSyncEnabled',
    );

    const hook = renderHookWithProvider(() =>
      useHandleOptInCancel({
        navigation: mockNavigation,
        metrics: mockMetrics,
        isCreatingNotifications: props.isCreatingNotifications,
      }),
    );

    return {
      hook,
      mockNavigate,
      mockTrackEvent,
      mockCreateEventBuilder,
      mockSelectIsBackupAndSyncEnabled,
    };
  };

  it('tracks event and navigates to wallet view if not creating notifications', () => {
    const { hook, mockNavigate, mockTrackEvent, mockCreateEventBuilder } =
      arrange({ isCreatingNotifications: false });

    hook.result.current();

    expect(mockTrackEvent).toHaveBeenCalledWith(
      mockCreateEventBuilder(MetaMetricsEvents.NOTIFICATIONS_ACTIVATED)
        .addProperties({
          action_type: 'dismissed',
          is_profile_syncing_enabled: true,
        })
        .build(),
    );
    expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET_VIEW);
  });

  it('only navigates to wallet view if creating notifications', () => {
    const { hook, mockNavigate, mockTrackEvent } = arrange({
      isCreatingNotifications: true,
    });

    hook.result.current();

    expect(mockTrackEvent).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET_VIEW);
  });
});
