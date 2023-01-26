import { StyleSheet } from 'react-native';
import { fontStyles } from '../../../styles/common';

export default (colors: any) =>
  StyleSheet.create({
    messageText: {
      fontSize: 14,
      color: colors.text.default,
      ...fontStyles.normal,
      textAlign: 'center',
    },
    messageTextColor: {
      color: colors.text.default,
    },
    textLeft: {
      textAlign: 'left',
    },
    messageWrapper: {
      marginBottom: 4,
    },
  });
