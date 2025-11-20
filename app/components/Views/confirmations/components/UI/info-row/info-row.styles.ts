import { StyleSheet } from 'react-native';

import { Theme } from '../../../../../../util/theme/models';
import { fontStyles } from '../../../../../../styles/common';
import { InfoRowVariant } from './info-row';

const styleSheet = (params: {
  theme: Theme;
  vars: { variant: InfoRowVariant };
}) => {
  const { theme, vars } = params;

  return StyleSheet.create({
    container: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'center',
      flexWrap: 'wrap',
      paddingBottom: vars.variant === InfoRowVariant.Small ? 10 : 8,
      paddingHorizontal: 8,
    },
    labelContainer: {
      display: 'flex',
      flexDirection: 'row',
      alignSelf: 'flex-start',
      alignItems: 'center',
      minHeight: 24,
      paddingEnd: 4,
      marginRight: 'auto',
    },
    value: {
      color: theme.colors.text.default,
      ...fontStyles.normal,
    },
    valueOnNewLineContainer: {
      paddingBottom: 8,
      paddingHorizontal: 8,
    },
    labelContainerWithoutLabel: {
      marginLeft: -4,
    },
  });
};

export default styleSheet;
