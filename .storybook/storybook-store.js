import { AppThemeKey } from '../app/util/theme/models';
import initialRootState from '../app/util/test/initial-root-state';

export const storybookStore = {
  ...initialRootState,
  user: {
    ...initialRootState.user,
    appTheme: AppThemeKey.os,
  },
};
