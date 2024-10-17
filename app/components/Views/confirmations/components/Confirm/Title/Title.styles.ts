import { StyleSheet } from 'react-native';

import { Theme } from '../../../../../../util/theme/models';
import { fontStyles } from '../../../../../../styles/common';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    titleContainer: {
      marginBottom: 24,
    },
    title: {
      color: theme.colors.text.default,
      ...fontStyles.bold,
      fontSize: 18,
      fontWeight: '700',
      textAlign: 'center',
    },
  });
};

export default styleSheet;
