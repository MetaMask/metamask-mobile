import { StyleSheet } from 'react-native';

import { Theme } from '../../../../../../util/theme/models';
import { Severity } from '../../../types/alerts';

const styleSheet = (params: { theme: Theme; vars: { severity: Severity } }) => {
  const { theme, vars } = params;
  const { colors } = theme;

  const isWarning = vars.severity === Severity.Warning;
  const isDanger = vars.severity === Severity.Danger;

  const backgroundColor = isDanger
    ? colors.error.muted
    : isWarning
      ? colors.warning.muted
      : colors.background.alternative;

  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'center',
      backgroundColor,
      borderRadius: 99,
      paddingVertical: 4,
      paddingLeft: 8,
      paddingRight: 6,
      gap: 4,
    },
  });
};

export default styleSheet;
