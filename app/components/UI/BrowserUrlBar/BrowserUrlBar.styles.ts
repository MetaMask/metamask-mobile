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
    hidden: {
      position: 'absolute',
      opacity: 0,
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
    urlBarText: {
      ...fontStyles.normal,
      fontSize: Device.isAndroid() ? 16 : 14,
      color: colors.text.default,
      position: isUrlBarFocused ? 'absolute' : 'relative',
      opacity: isUrlBarFocused ? 0 : 1,
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
      color: colors.text.default,
      fontWeight: '500',
    },
    rightButton: { height: 50, justifyContent: 'center' },
    tabsButton: {
      height: 50,
      justifyContent: 'center',
      alignItems: 'center',
      paddingTop: 12,
      paddingBottom: 12,
    },
    tabsButtonAndroid: {
      paddingLeft: 7,
      paddingRight: 7,
    },
    tabsButtonIOS: {
      paddingLeft: 8,
      paddingRight: 8,
    },
    tabIcon: {
      width: 30,
      height: 30,
    },
  });

export default styleSheet;
