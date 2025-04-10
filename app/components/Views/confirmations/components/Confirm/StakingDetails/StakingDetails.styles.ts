import { StyleSheet } from 'react-native';
import { fontStyles } from '../../../../../../styles/common';
import { Theme } from '../../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    primaryValue: {
      color: theme.colors.text.default,
      ...fontStyles.normal,
      fontSize: 14,
    },
    secondaryValue: {
      color: theme.colors.text.alternative,
      ...fontStyles.normal,
      fontSize: 14,
      marginRight: 8,
    },
    valueContainer: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
    },
  });
};

export default styleSheet;
