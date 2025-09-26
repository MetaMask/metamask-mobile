import { StyleSheet } from 'react-native';

import { Theme } from '../../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme; vars: { isLast?: boolean } }) => {
  const {
    theme: { colors },
    vars: { isLast },
  } = params;

  return StyleSheet.create({
    divider: {
      backgroundColor: colors.icon.alternative,
      marginLeft: 9,
      marginRight: 22,
      width: isLast ? 0 : 2,
      marginVertical: 3,
    },
    secondary: {
      paddingBottom: 12,
    },
    lineContainer: {
      padding: 6,
    },
  });
};

export default styleSheet;
