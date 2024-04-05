import { StyleSheet } from 'react-native';
import { fontStyles } from '../../../styles/common';

const createStyles = (colors: any) =>
  StyleSheet.create({
    addToAddressBookRoot: {
      flex: 1,
      padding: 24,
    },
    addToAddressBookWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    addTextTitle: {
      ...fontStyles.normal,
      fontSize: 24,
      color: colors.text.default,
      marginBottom: 24,
    },
    addTextSubtitle: {
      ...fontStyles.normal,
      fontSize: 16,
      color: colors.text.alternative,
      marginBottom: 24,
    },
    addInputWrapper: {
      flexDirection: 'row',
      borderWidth: 1,
      borderRadius: 8,
      borderColor: colors.border.default,
      height: 50,
      width: '100%',
    },
    input: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: 6,
      width: '100%',
    },
    addTextInput: {
      ...fontStyles.normal,
      color: colors.text.default,
      fontSize: 20,
    },
  });

export default createStyles;
