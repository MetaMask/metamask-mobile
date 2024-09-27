import { StyleSheet } from 'react-native';

import { Colors } from '../../../../../../util/theme/models';

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    fill: {
      flex: 1,
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
