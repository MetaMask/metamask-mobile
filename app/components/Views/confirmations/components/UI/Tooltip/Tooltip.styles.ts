import { StyleSheet } from 'react-native';

import { Theme } from '../../../../../../util/theme/models';
import { fontStyles } from '../../../../../../styles/common';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    modal: {
      margin: 0,
    },
    modalView: {
      backgroundColor: theme.colors.background.default,
      justifyContent: 'center',
      alignItems: 'center',
      marginHorizontal: 16,
      borderRadius: 8,
      ...theme.shadows.size.sm,
      elevation: 11,
      paddingHorizontal: 16,
      paddingVertical: 24,
    },
    closeModalBtn: {
      position: 'absolute',
      top: 10,
      right: 10,
    },
    modalTitle: {
      color: theme.colors.text.default,
      ...fontStyles.bold,
      fontSize: 16,
      fontWeight: '700',
      marginTop: 8,
    },
    modalContent: {
      marginTop: 8,
      color: theme.colors.text.default,
      ...fontStyles.normal,
      fontSize: 14,
    },
  });
};

export default styleSheet;
