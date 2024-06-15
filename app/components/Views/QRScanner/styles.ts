import { StyleSheet } from 'react-native';
import { Theme } from '../../../util/theme/models';

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.brandColors.black,
    },
    preview: {
      flex: 1,
    },
    innerView: {
      flex: 1,
    },
    closeIcon: {
      marginTop: 20,
      marginRight: 20,
      width: 40,
      alignSelf: 'flex-end',
      color: theme.brandColors.white,
    },
    frame: {
      width: 250,
      height: 250,
      alignSelf: 'center',
      justifyContent: 'center',
      marginTop: 100,
      opacity: 0.5,
    },
    text: {
      flex: 1,
      fontSize: 17,
      color: theme.brandColors.white,
      textAlign: 'center',
      justifyContent: 'center',
      marginTop: 100,
    },
  });

export default createStyles;
