/* eslint-disable import/prefer-default-export */
import { useMemo } from 'react';
import { useAppThemeFromContext } from '../../util/theme';
import { Theme } from '../../util/theme/models';

/**
 * Hook that handles both passing style sheet variables into style sheet and memoization.
 *
 * @param styleSheet Return value of useStyles hook.
 * @param vars Variables of styleSheet function (optional).
 * @returns StyleSheet object.
 */
// Overload: when vars is provided
export function useStyles<R, V>(
  styleSheet: (params: { theme: Theme; vars: V }) => R,
  vars: V,
): { styles: R; theme: Theme };

// Overload: when vars is not provided
export function useStyles<R>(styleSheet: (params: { theme: Theme }) => R): {
  styles: R;
  theme: Theme;
};

export function useStyles<R, V>(
  styleSheet:
    | ((params: { theme: Theme; vars: V }) => R)
    | ((params: { theme: Theme }) => R),
  vars?: V,
): { styles: R; theme: Theme } {
  const theme = useAppThemeFromContext();
  const styles = useMemo(
    () => styleSheet({ theme, vars: vars as V }),
    [styleSheet, theme, vars],
  );
  return { styles, theme };
}
