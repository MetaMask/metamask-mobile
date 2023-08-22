import { Colors } from '../../../../util/theme/models';
import { fontStyles } from '../../../../styles/common';
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
    accountNameLabelText: {
      marginLeft: 4,
      paddingHorizontal: 8,
      ...fontStyles.bold,
      color: colors.text.alternative,
      borderWidth: 1,
      borderRadius: 8,
      borderColor: colors.border.default,
      fontSize: 10,
    },
  });

export default styleSheet;
