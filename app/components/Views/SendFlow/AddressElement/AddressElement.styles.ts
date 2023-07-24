import { Colors } from '../../../../util/theme/models';
import { StyleSheet } from 'react-native';

const styleSheet = (colors: Colors) =>
  StyleSheet.create({
    addressElementWrapper: {
      padding: 16,
      flexDirection: 'row',
    },
    addressElementInformation: {
      flex: 1,
      flexDirection: 'column',
    },
    addressIdenticon: {
      paddingRight: 16,
    },
    addressTextNickname: {
      flex: 1,
      color: colors.text.default,
    },
    addressTextAddress: {
      color: colors.text.alternative,
    },
  });

export default styleSheet;
