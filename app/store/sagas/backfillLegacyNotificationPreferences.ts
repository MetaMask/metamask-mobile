import { call, select, take } from 'redux-saga/effects';
import {
  HAS_USER_TURNED_OFF_ONCE_NOTIFICATIONS,
  LEGACY_NOTIFICATION_AUS_BACKFILL_PENDING,
  TRUE,
} from '../../constants/storage';
import { UserActionType } from '../../actions/user';
import Engine from '../../core/Engine';
import type { RootState } from '../../reducers';
import {
  selectIsFeatureAnnouncementsEnabled,
  selectIsMetamaskNotificationsEnabled,
} from '../../selectors/notifications';
import Logger from '../../util/Logger';
import StorageWrapper from '../storage-wrapper';

/**
 * Initialize missing AUS notification preferences once for eligible legacy
 * users. Existing preferences are preserved by `createOnChainTriggers`.
 */
export function* backfillLegacyNotificationPreferencesSaga() {
  yield take(UserActionType.LOGIN);

  if (
    StorageWrapper.getItemSync(LEGACY_NOTIFICATION_AUS_BACKFILL_PENDING) !==
    TRUE
  ) {
    return;
  }

  try {
    const notificationsEnabled: boolean = yield select(
      selectIsMetamaskNotificationsEnabled,
    );
    const hasMarketingConsent: boolean = yield select(
      (state: RootState) => state.security.dataCollectionForMarketing === true,
    );
    const hasExplicitlyDisabledNotifications =
      StorageWrapper.getItemSync(HAS_USER_TURNED_OFF_ONCE_NOTIFICATIONS) ===
      TRUE;
    // The legacy marketing-only onboarding path recorded consent without
    // initializing notifications or AUS, so either signal makes this eligible.
    // Never let that inference override a subsequent explicit in-app opt-out.
    if (
      !notificationsEnabled &&
      (!hasMarketingConsent || hasExplicitlyDisabledNotifications)
    ) {
      yield call(
        [StorageWrapper, StorageWrapper.removeItem],
        LEGACY_NOTIFICATION_AUS_BACKFILL_PENDING,
      );
      return;
    }

    const productAnnouncementEnabled: boolean = yield select(
      selectIsFeatureAnnouncementsEnabled,
    );

    yield call(
      [
        Engine.context.NotificationServicesController,
        Engine.context.NotificationServicesController.createOnChainTriggers,
      ],
      {
        hasMarketingConsent,
        productAnnouncementEnabled,
        registerPushNotifications: false,
      },
    );
    yield call(
      [StorageWrapper, StorageWrapper.removeItem],
      LEGACY_NOTIFICATION_AUS_BACKFILL_PENDING,
    );
  } catch (error) {
    Logger.error(
      error instanceof Error ? error : new Error(String(error)),
      'Failed to backfill legacy notification preferences',
    );
  }
}
