/* eslint-disable import/prefer-default-export */
import { StyleSheet } from 'react-native';
import { Colors } from '../../../util/theme/models';

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    mainWrapper: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    wrapper: {
      flexGrow: 1,
      paddingHorizontal: 16,
      paddingBottom: 12,
    },
    contentContainer: {
      flex: 1,
    },
    subtitleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    buttonWrapper: {
      marginTop: 24,
    },
  });

export { createStyles };
