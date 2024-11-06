export default function migrate(state: unknown) {
    if (state.engine.backgroundState.NotificationServicesController) return state
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