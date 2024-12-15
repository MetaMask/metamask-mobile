import { useMemo } from 'react';
import { createStyles } from './styles';
import { useTheme } from '../../../../util/theme';

export default function useStyles() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return { theme, styles };
}
