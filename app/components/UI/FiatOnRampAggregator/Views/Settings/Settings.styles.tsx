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
      flex: 1,
      borderColor: colors.border.default,
      borderRadius: 5,
      borderWidth: 2,
      padding: 10,
      marginHorizontal: 5,
      flexDirection: 'row',
      alignItems: 'center',
      color: colors.text.default,
    },
    buttons: {
      flexDirection: 'row',
    },
    button: {
      flex: 1,
      marginHorizontal: 5,
    },
  });

export default styles;
