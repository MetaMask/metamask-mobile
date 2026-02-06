import { ThemeColors } from '@metamask/design-tokens';
import { StyleSheet } from 'react-native';
import { fontStyles } from '../../../styles/common';
import Device from '../../../util/device';

export const ROW_HEIGHT = 56;
const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    dropdown: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    selectedOption: {
      color: colors.text.default,
      fontSize: 14,
      paddingHorizontal: 10,
      paddingTop: 8,
      paddingBottom: 8,
      ...fontStyles.normal,
      fontWeight: 600,
    },
    label: {
      textAlign: 'center',
      flex: 1,
      paddingVertical: 10,
      fontSize: 17,
      ...fontStyles.bold,
      color: colors.text.default,
    },
    list: {
      width: '100%',
    },
    optionButton: {
      paddingHorizontal: 16,
      paddingVertical: 16,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      height: Device.isIos() ? ROW_HEIGHT : undefined,
    },
    optionButtonSelected: {
      backgroundColor: colors.background.muted,
    },
    optionLabel: {
      flex: 1,
      fontSize: 16,
      fontWeight: 500,
      ...fontStyles.normal,
      color: colors.text.default,
    },
    icon: {
      paddingHorizontal: 10,
    },
    listWrapper: {
      flex: 1,
      paddingBottom: 10,
    },
  });

export default createStyles;
