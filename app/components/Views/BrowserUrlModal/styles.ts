/* eslint-disable import/prefer-default-export */
import { fontStyles } from '../../../styles/common';
import { StyleSheet } from 'react-native';
import Device from '../../../util/device';

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const createStyles = (colors: any) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background.default,
    },
    urlModalContent: {
      flexDirection: 'row',
      paddingHorizontal: 10,
      alignItems: 'center',
    },
    clearButton: { paddingHorizontal: 12, justifyContent: 'center' },
    urlInput: {
      ...fontStyles.normal,
      fontSize: Device.isAndroid() ? 16 : 14,
      paddingLeft: 15,
      paddingVertical: 6,
      flex: 1,
      color: colors.text.default,
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
    cancelButton: {
      marginLeft: 10,
    },
    cancelButtonText: {
      fontSize: 14,
      color: colors.primary.default,
      ...fontStyles.normal,
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
    searchWrapper: {
      flexDirection: 'row',
      borderRadius: 30,
      backgroundColor: colors.background.alternative,
      flex: 1,
    },
  });
