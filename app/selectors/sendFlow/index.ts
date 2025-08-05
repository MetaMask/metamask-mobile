import { RootState } from '../../reducers';

export const selectSendFlowContextualChainId = (state: RootState) =>
  state?.networkOnboarded?.sendFlowChainId;
