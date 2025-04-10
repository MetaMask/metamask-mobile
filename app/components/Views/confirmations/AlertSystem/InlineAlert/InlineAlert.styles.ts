import { StyleSheet } from 'react-native';

import { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: {
  theme: Theme;
}) => {
  const {
    theme,
  } = params;

  return StyleSheet.create({
    wrapper: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      padding: 4,
      backgroundColor: theme.colors.error.default,
      borderRadius: 4,
      marginLeft: 4,
    },
    inlineContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      flexShrink: 1,
    },
    icon: {
      marginRight: 4,
    },
  });
};

export default styleSheet;
