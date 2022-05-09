import { useMemo } from 'react';
import { Theme } from '../../util/theme/models';
import { useAppThemeFromContext } from '../../util/theme';

/**
 * useStyles, a custom hook that memoizes the stylesheet object with the supplied parameters
 * @param createStyles function which creates a stylesheet
 * @param params parameters that are used inside the stylesheet
 * @returns memoized stylesheet object
 */
const useStyles = <K, T>(
  createStyles: (vars: T, theme: Theme) => K,
  styleVars: T,
) => {
  const appTheme = useAppThemeFromContext();
  return useMemo(
    () => createStyles(styleVars, appTheme),
    [createStyles, styleVars, appTheme],
  );
};

export default useStyles;
