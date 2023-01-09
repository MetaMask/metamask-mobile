import { StyleSheet } from 'react-native';
import { fontStyles } from '../../../../../styles/common';
import { Colors } from '../../../../../util/theme/models';

const styles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    input: {
      ...fontStyles.normal,
      borderColor: colors.border.default,
      borderRadius: 5,
      borderWidth: 2,
      padding: 10,
      color: colors.text.default,
    },
    buttons: {
      flexDirection: 'row',
      marginHorizontal: -5,
    },
    button: {
      flex: 1,
      marginHorizontal: 5,
    },
    title: {
      fontSize: 20,
    },
  });

export default styles;
