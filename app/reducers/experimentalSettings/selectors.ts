import { RootState } from '..';

export const selectMmPayDebugEnabled = (state: RootState): boolean =>
  Boolean(state.experimentalSettings?.mmPayDebugEnabled);

export const selectNativeTabBarEnabled = (state: RootState): boolean =>
  Boolean(state.experimentalSettings?.nativeTabBarEnabled);

export const selectNativeHeaderEnabled = (state: RootState): boolean =>
  Boolean(state.experimentalSettings?.nativeHeaderEnabled);
