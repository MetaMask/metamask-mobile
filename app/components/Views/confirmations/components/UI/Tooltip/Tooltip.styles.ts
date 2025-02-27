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
      backgroundColor: theme.colors.background.alternative,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 8,
      ...theme.shadows.size.sm,
      elevation: 11,
      paddingHorizontal: 16,
      paddingVertical: 24,
    },
      modalHeader: {
      flexDirection: 'row',
      justifyContent: 'center',
      width: '100%',
    },
    closeModalBtn: {
      alignSelf: 'center',
      position: 'absolute',
      left: 0,
    },
    modalTitle: {
      color: theme.colors.text.default,
      ...fontStyles.bold,
      fontSize: 16,
      fontWeight: '700',
    },
    modalContent: {
      width: '100%',
      backgroundColor: theme.colors.background.default,
      marginTop: 16,
      paddingVertical: 20,
      borderRadius: 8,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    modalContentValue: {
      color: theme.colors.text.default,
      ...fontStyles.normal,
      fontSize: 14,
    },
  });
};

export default styleSheet;
