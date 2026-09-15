import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../../../../util/theme/models';
import { colors as importedColors } from '../../../../../../../../../styles/common';

const styleSheet = (theme: Theme) => {
  const { colors } = theme;

  return StyleSheet.create({
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
      alignItems: 'flex-end',
      borderColor: importedColors.transparent,
      borderWidth: 0,
      padding: 0,
      flexWrap: 'wrap',
    },
    loadingFiatValue: {
      height: 24,
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
      columnGap: 5,
      rowGap: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      flexWrap: 'wrap',
    },
    valueIsCredit: {
      backgroundColor: colors.success.muted,
      color: colors.success.default,
    },
    valueIsDebit: {
      backgroundColor: colors.error.muted,
      color: colors.error.default,
    },
    valueModalText: {
      textAlign: 'center',
    },
  });
};

export default styleSheet;
