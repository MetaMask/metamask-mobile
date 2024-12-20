import { StyleSheet } from 'react-native';
import { Theme } from '../../../util/theme/models';
import { fontStyles } from '../../../styles/common';
import Device from '../../../util/device';

const styleSheet = ({ theme: { colors } }: { theme: Theme }) =>
  StyleSheet.create({
    main: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      paddingHorizontal: 16,
    },
    textInput: {
      flex: 1,
      height: 44,
      padding: 0,
      margin: 0,
      paddingLeft: 8,
      ...fontStyles.normal,
      fontSize: Device.isAndroid() ? 16 : 14,
      color: colors.text.default,
    },
    browserUrlBarWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
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
