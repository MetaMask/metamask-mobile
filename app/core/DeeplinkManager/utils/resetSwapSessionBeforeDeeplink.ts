import Engine from '../../Engine';
import ReduxService from '../../redux/ReduxService';
import { resetBridgeState } from '../../redux/slices/bridge';

export const resetSwapSessionBeforeDeeplink = () => {
  ReduxService.store.dispatch(resetBridgeState());
  Engine.context.BridgeController?.resetState?.();
};
