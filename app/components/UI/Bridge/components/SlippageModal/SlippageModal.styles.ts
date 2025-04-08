import { StyleSheet } from 'react-native';
import { fontStyles } from '../../../../../styles/common';
import { Theme } from '../../../../../util/theme/models';

const createStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    container: {
      padding: 24,
      paddingBottom: 21,
      alignItems: 'center',
    },
    title: {
      textAlign: 'center',
    },
    description: {
      fontSize: 14,
      lineHeight: 20,
      color: colors.text.default,
      ...fontStyles.normal,
    },
    optionsContainer: {
      alignItems: 'center',
      marginBottom: 12,
      paddingHorizontal: 24,
      paddingVertical: 16,
    },
  });

export default createStyles;
