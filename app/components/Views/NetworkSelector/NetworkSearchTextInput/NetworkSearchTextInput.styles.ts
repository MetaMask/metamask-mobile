import { StyleSheet } from 'react-native';
import { fontStyles } from '../../../../styles/common';
import { Colors } from '../../../../util/theme/models';
import { isNetworkUiRedesignEnabled } from '../../../../util/networks';

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 10,
      borderRadius: 5,
      borderWidth: 1,
      borderColor: colors.border.default,
      color: colors.text.default,
    },
    input: {
      flex: 1,
      fontSize: 14,
      color: colors.text.default,
      ...fontStyles.normal,
      paddingLeft: 10,
    },
  });

export default createStyles;
