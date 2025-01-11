import { StyleSheet } from 'react-native';
import { Theme } from '../../../util/theme/models';
import { fontStyles } from '../../../styles/common';
import Device from '../../../util/device';

const styleSheet = ({
  theme: { colors },
  vars: { isUrlBarFocused },
}: {
  theme: Theme;
  vars: { isUrlBarFocused: boolean };
}) =>
  StyleSheet.create({
    main: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      borderRadius: 999,
      marginHorizontal: 16,
      backgroundColor: isUrlBarFocused
        ? colors.background.alternative
        : colors.background.default,
    },
    connectionIcon: {
      marginRight: 8,
    },
    textInputWrapper: {
      flex: 1,
    },
    textInput: {
      flex: 1,
      height: 44,
      paddingVertical: 0,
      margin: 0,
      paddingLeft: isUrlBarFocused ? 16 : 0,
      ...fontStyles.normal,
      fontSize: Device.isAndroid() ? 16 : 14,
      color: colors.text.default,
    },
    browserUrlBarWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    clearButton: {
      marginRight: 8,
      marginLeft: 4,
    },
    cancelButton: {
      marginRight: 16,
      justifyContent: 'center',
    },
    cancelButtonText: {
      fontSize: 14,
      color: colors.primary.default,
      ...fontStyles.normal,
    },
    rightButton: { height: 50, justifyContent: 'center' },
  });

export default styleSheet;
