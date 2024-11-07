export default function migrate(state) {
    state.engine.backgroundState.NotificationServicesController = undefined;
    state.engine.backgroundState.NotificationServicesControllerState = undefined;
    return state;
}
