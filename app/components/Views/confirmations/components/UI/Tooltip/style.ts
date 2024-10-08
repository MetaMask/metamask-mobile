import { StyleSheet } from 'react-native';

import { Colors, Theme } from '../../../../../../util/theme/models';
import { fontStyles } from '../../../../../../styles/common';

const createStyles = (colors: Colors, shadows: Theme['shadows']) =>
  StyleSheet.create({
    modal: {
      margin: 0,
    },
    modalView: {
      backgroundColor: colors.background.default,
      justifyContent: 'center',
      alignItems: 'center',
      marginHorizontal: 16,
      borderRadius: 8,
      ...shadows.size.sm,
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
      color: colors.text.default,
      ...fontStyles.bold,
      fontSize: 16,
      fontWeight: '700',
      marginBottom: 16,
    },
    modalContent: {
      color: colors.text.default,
      ...fontStyles.normal,
      fontSize: 14,
    }
  });

export default createStyles;
