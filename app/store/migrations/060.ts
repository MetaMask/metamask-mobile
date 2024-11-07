import { ensureValidState } from "./util";
import { hasProperty, isObject } from '@metamask/utils';

export default function migrate(state: unknown) {
    if (!ensureValidState(state, 60)) {
        return state;
    }

    if (
        !hasProperty(state.engine.backgroundState, 'NotificationServicesController') ||
        !isObject(state.engine.backgroundState.NotificationServicesController)
    ) {
        state.engine.backgroundState.NotificationServicesController = {
            isCheckingAccountsPresence: false,
            isFeatureAnnouncementsEnabled: false,
            isFetchingMetamaskNotifications: false,
            isMetamaskNotificationsFeatureSeen: false,
            isNotificationServicesEnabled: false,
            isUpdatingMetamaskNotifications: false,
            isUpdatingMetamaskNotificationsAccount: [],
            metamaskNotificationsList: [],
            metamaskNotificationsReadList: [],
            subscriptionAccountsSeen: [],
        }
        return
    }
    return state;
}