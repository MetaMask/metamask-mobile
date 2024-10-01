import { StyleSheet } from 'react-native';

import { Colors } from '../../../../../../util/theme/models';
import { fontStyles } from '../../../../../../styles/common';

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.background.default,
      borderColor: colors.border.muted,
      borderRadius: 8,
      borderWidth: 1,
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
    },
    // eslint-disable-next-line react-native/no-color-literals
    modalContainer: {
      backgroundColor: '#414141',
      minHeight: '100%',
    },
    modalContent: {
      backgroundColor: colors.background.alternative,
      paddingTop: 24,
      paddingBottom: 34,
      paddingHorizontal: 16,
      borderTopLeftRadius: 8,
      borderTopRightRadius: 8,
    },
    modalHeader: {
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      paddingBottom: 16,
    },
    modalTitle: {
      color: colors.text.default,
      ...fontStyles.bold,
      fontSize: 14,
      fontWeight: '700',
      width: '90%',
      textAlign: 'center',
    },
  });

export default createStyles;
