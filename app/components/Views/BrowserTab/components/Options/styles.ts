import { StyleSheet } from 'react-native';
import { Theme } from '@metamask/design-tokens';
import { fontStyles } from '../../../../../styles/common';
import Device from '../../../../../util/device';

const styleSheet = ({ theme: { colors, shadows } }: { theme: Theme }) =>
  StyleSheet.create({
    optionsOverlay: {
      position: 'absolute',
      zIndex: 99999998,
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
    },
    optionsWrapper: {
      position: 'absolute',
      zIndex: 99999999,
      width: 200,
      borderWidth: 1,
      borderColor: colors.border.default,
      backgroundColor: colors.background.default,
      borderRadius: 10,
      paddingBottom: 5,
      paddingTop: 10,
    },
    optionsWrapperAndroid: {
      ...shadows.size.xs,
      bottom: 65,
      right: 5,
    },
    optionsWrapperIos: {
      ...shadows.size.xs,
      bottom: 90,
      right: 5,
    },
    option: {
      paddingVertical: 10,
      height: 'auto',
      minHeight: 44,
      paddingHorizontal: 15,
      backgroundColor: colors.background.default,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-start',
      marginTop: Device.isAndroid() ? 0 : -5,
    },
    optionText: {
      fontSize: 16,
      lineHeight: 16,
      alignSelf: 'center',
      justifyContent: 'center',
      marginTop: 3,
      color: colors.primary.default,
      flex: 1,
      ...fontStyles.fontPrimary,
    },
    optionIconWrapper: {
      flex: 0,
      borderRadius: 5,
      backgroundColor: colors.primary.muted,
      padding: 3,
      marginRight: 10,
      alignSelf: 'center',
    },
    optionIcon: {
      color: colors.primary.default,
      textAlign: 'center',
      alignSelf: 'center',
      fontSize: 18,
    },
  });

export default styleSheet;
