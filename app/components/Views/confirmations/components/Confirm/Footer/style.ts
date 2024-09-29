import { StyleSheet } from 'react-native';

import { Colors } from '../../../../../../util/theme/models';

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    confirmButton: {
      flex: 1,
    },
    rejectButton: {
      flex: 1,
      backgroundColor: colors.background.alternative,
    },
    divider: {
      height: 1,
      backgroundColor: colors.border.muted,
    },
    buttonsContainer: {
      flexDirection: 'row',
      padding: 16,
    },
    buttonDivider: {
      width: 8,
    },
  });

export default createStyles;
