export default function migrate(state) {
    state.engine.backgroundState.NotificationServicesControllerState = undefined
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