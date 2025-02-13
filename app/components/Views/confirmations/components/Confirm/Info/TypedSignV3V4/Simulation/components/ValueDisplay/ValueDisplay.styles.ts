import { StyleSheet } from 'react-native';
import { Theme } from '@metamask/design-tokens';
import {
  fontStyles,
  colors as importedColors,
} from '../../../../../../../../../../styles/common';

const styleSheet = (colors: Theme['colors']) =>
  StyleSheet.create({
    wrapper: {
      marginLeft: 'auto',
      maxWidth: '100%',
      alignSelf: 'flex-end',
      justifyContent: 'flex-end',
      borderWidth: 0,
      padding: 0,
    },
    fiatDisplay: {
      paddingEnd: 8,
    },
    flexRowTokenValueAndAddress: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'center',
      borderColor: importedColors.transparent,
      borderWidth: 0,
      padding: 0,
    },
    loaderButtonPillEmptyContent: {
      height: 22,
      width: 22,
    },
    marginStart4: {
      marginStart: 4,
    },
    tokenValueTooltipContent: {
      borderRadius: 12,
      paddingHorizontal: 8,
      paddingTop: 4,
      paddingBottom: 4,
      textAlign: 'center',
    },
    valueAndAddress: {
      paddingVertical: 4,
      paddingLeft: 8,
      gap: 5,
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'center',
    },
    valueIsCredit: {
      backgroundColor: colors.success.muted,
      color: colors.success.default,
    },
    valueIsDebit: {
      backgroundColor: colors.error.muted,
      color: colors.error.default,
    },
    valueModal: {
      backgroundColor: colors.background.alternative,
      paddingTop: 24,
      paddingBottom: 34,
      paddingHorizontal: 16,
      borderTopLeftRadius: 8,
      borderTopRightRadius: 8,
    },
    valueModalHeader: {
      alignItems: 'center',
      display: 'flex',
      flexDirection: 'row',
      paddingBottom: 16,
      position: 'relative',
      textAlign: 'center',
      width: '100%',
    },
    valueModalHeaderIcon: {
      position: 'absolute',
      top: 0,
      left: 0,
    },
    valueModalHeaderText: {
      color: colors.text.default,
      ...fontStyles.bold,
      fontSize: 14,
      fontWeight: '700',
      textAlign: 'center',
      width: '100%',
      // height of header icon
      minHeight: 24,
    },
    valueModalText: {
      textAlign: 'center',
    },
  });

export default styleSheet;
