import { ensureValidState } from "./util";

export default function migrate(state: unknown) {
    if (!ensureValidState(state, 60)) {
        return state;
    }
    if (state.engine.backgroundState.NotificationServicesController) return
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
    return state;
}