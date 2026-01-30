import { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../reducers';
import Routes from '../../../../constants/navigation/Routes';
import { IUseMetricsHook, MetaMetricsEvents } from '../../../hooks/useMetrics';
import { selectIsBackupAndSyncEnabled } from '../../../../selectors/identity';
import type { RootNavigationProp } from '../../../../util/navigation/types';

/**
 * Creating wallet notifications can take time, so we will use optimistic loader
 * to navigate to the notification list page if it takes too long
 * @param props - props to determine if effect should run
 */
export function useOptimisticNavigationEffect(props: {
  isCreatingNotifications: boolean;
  navigation: RootNavigationProp;
}) {
  const { isCreatingNotifications, navigation } = props;
  const [optimisticLoading, setOptimisticLoading] = useState(false);

  useEffect(() => {
    let timeOut: NodeJS.Timeout | undefined;

    if (isCreatingNotifications) {
      setOptimisticLoading(true);
      timeOut = setTimeout(() => {
        setOptimisticLoading(false);
        navigation.navigate(Routes.NOTIFICATIONS.VIEW);
      }, 5000);
    } else {
      setOptimisticLoading(false);
      if (timeOut) {
        clearTimeout(timeOut);
      }
    }

    // Cleanup function to clear the timeout if the component unmounts or if isCreatingNotifications changes
    return () => {
      if (timeOut) {
        clearTimeout(timeOut);
      }
    };
  }, [isCreatingNotifications, navigation]);

  return optimisticLoading;
}

export function useHandleOptInClick(props: {
  navigation: RootNavigationProp;
  metrics: IUseMetricsHook;
  enableNotifications: () => Promise<void>;
}) {
  const { navigation, enableNotifications, metrics } = props;
  const { trackEvent, createEventBuilder } = metrics;

  const basicFunctionalityEnabled = useSelector(
    (state: RootState) => state.settings.basicFunctionalityEnabled,
  );
  const isBackupAndSyncEnabled = useSelector(selectIsBackupAndSyncEnabled);

  const handleOptInClick = useCallback(async () => {
    // Navigate to Basic Functionality if not enabled
    if (!basicFunctionalityEnabled) {
      navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.SHEET.BASIC_FUNCTIONALITY,
        params: {
          caller: Routes.NOTIFICATIONS.OPT_IN,
        },
      });
      return;
    }

    // Enable Notifications (+ push notifications)
    await enableNotifications();

    navigation.navigate(Routes.NOTIFICATIONS.VIEW);

    trackEvent(
      createEventBuilder(MetaMetricsEvents.NOTIFICATIONS_ACTIVATED)
        .addProperties({
          action_type: 'completed',
          is_profile_syncing_enabled: isBackupAndSyncEnabled,
        })
        .build(),
    );
  }, [
    basicFunctionalityEnabled,
    enableNotifications,
    navigation,
    isBackupAndSyncEnabled,
    trackEvent,
    createEventBuilder,
  ]);

  return handleOptInClick;
}

export function useHandleOptInCancel(props: {
  navigation: RootNavigationProp;
  metrics: IUseMetricsHook;
  isCreatingNotifications: boolean;
}) {
  const { navigation, metrics, isCreatingNotifications } = props;
  const { trackEvent, createEventBuilder } = metrics;

  const isBackupAndSyncEnabled = useSelector(selectIsBackupAndSyncEnabled);

  const handleOptInCancel = useCallback(() => {
    if (!isCreatingNotifications) {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.NOTIFICATIONS_ACTIVATED)
          .addProperties({
            action_type: 'dismissed',
            is_profile_syncing_enabled: isBackupAndSyncEnabled,
          })
          .build(),
      );
    }
    navigation.navigate(Routes.WALLET_VIEW);
  }, [
    createEventBuilder,
    isCreatingNotifications,
    isBackupAndSyncEnabled,
    navigation,
    trackEvent,
  ]);

  return handleOptInCancel;
}
