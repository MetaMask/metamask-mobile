import { RootState } from '..';

export const selectMmPayDebugEnabled = (state: RootState): boolean =>
  Boolean(state.experimentalSettings?.mmPayDebugEnabled);
