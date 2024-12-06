import { StyleSheet } from 'react-native';
import { Theme } from '@metamask/design-tokens';
import { colors as importedColors } from '../../../../../../../../../styles/common';

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
    flexRowTokenValueAndAddress: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'flex-end',
      borderColor: importedColors.transparent,
      borderWidth: 0,
      padding: 0,
    },
    tokenAddress: {
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
      backgroundColor: colors.background.alternative,
      color: colors.text.default,
      borderRadius: 99,
      paddingVertical: 4,
      paddingLeft: 8,
      paddingRight: 8,
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
  });

export default styleSheet;
