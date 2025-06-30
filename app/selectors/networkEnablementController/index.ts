import { RootState } from '../../reducers';

export const selectNetworkEnablementControllerState = (state: RootState) =>
  state.engine?.backgroundState?.NetworkEnablementController;
