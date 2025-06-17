import { createSelector } from 'reselect';

import { RootState } from '../reducers';

const selectModalsState = (state: RootState) => state.modals;

export const selectShowDeepLinkModal = createSelector(
  selectModalsState,
  (modalsState) => modalsState.showDeepLinkModal,
);
