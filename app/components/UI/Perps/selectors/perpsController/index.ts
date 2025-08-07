import { createSelector } from 'reselect';
import { RootState } from '../../../../../reducers';

const selectPerpsControllerState = (state: RootState) =>
  state.engine.backgroundState.PerpsController;

const selectPerpsProvider = createSelector(
  selectPerpsControllerState,
  (perpsControllerState) => perpsControllerState.activeProvider,
);

export { selectPerpsProvider };
