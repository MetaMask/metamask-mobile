import type { RootState } from '../reducers';

export const selectAppTheme = (state: RootState) => state.user.appTheme;
