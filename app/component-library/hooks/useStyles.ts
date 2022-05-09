/* eslint-disable import/prefer-default-export */
import { useMemo } from 'react';
import { useAppThemeFromContext } from '../../util/theme';
import { Theme } from '../../util/theme/models';

/**
 * Hook that handles both passing style sheet variables into style sheet and memoization.
 *
 * @param styleSheet Return value of useStyles hook.
 * @param styleSheetVars Variables of styleSheet function.
 * @returns
 */
export const useStyles = <R, V>(
  styleSheet: (theme: Theme, vars: V) => R,
  styleSheetVars: V,
) => {
  const appTheme = useAppThemeFromContext();
  const styles = useMemo(
    () => styleSheet(appTheme, styleSheetVars),
    [styleSheet, appTheme, styleSheetVars],
  );
  return styles;
};
