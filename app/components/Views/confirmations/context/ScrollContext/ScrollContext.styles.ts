import { StyleSheet } from 'react-native';

import { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    scrollableSection: {
      padding: 4,
    },
    scrollable: {
      paddingHorizontal: 16,
    },
    scrollButton: {
      backgroundColor: theme.colors.primary.default,
      borderRadius: 20,
      bottom: '16%',
      left: '50%',
      padding: 20,
      position: 'absolute',
      zIndex: 1,
    },
  });
};

export default styleSheet;
