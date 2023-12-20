import { StyleSheet } from 'react-native';
import { Colors } from '../../../../util/theme/models';

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
      color: colors.text.alternative,
      borderWidth: 1,
      borderRadius: 8,
      borderColor: colors.border.default,
    },
    accountNameLabel: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-start',
    },
    warningIconWrapper: {
      padding: 4,
      alignSelf: 'flex-start',
    },
    warningIcon: {
      color: colors.icon.default,
    },
  });

export default styleSheet;
