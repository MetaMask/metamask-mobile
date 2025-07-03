import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../../../util/theme/models';

const styleSheet = (params: {
  theme: Theme;
  vars: { isFlatConfirmation: boolean };
}) => {
  const { theme, vars } = params;
  const { isFlatConfirmation } = vars;

  return StyleSheet.create({
    container: {
      paddingVertical: 16,
    },
    assetAmountContainer: {
      paddingTop: 8,
    },
    assetAmountText: {
      textAlign: 'center',
    },
    assetFiatConversionText: {
      textAlign: 'center',
      color: theme.colors.text.alternative,
    },
    networkAndTokenContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
<<<<<<< HEAD:app/components/UI/Earn/Views/EarnLendingDepositConfirmationView/components/Erc20TokenHero/Erc20TokenHero.styles.ts
    networkAvatar: {
      width: 24,
      height: 24,
=======
    networkLogo: {
      width: 48,
      height: 48,
    },
    container: {
      paddingBottom: 16,
      paddingTop: isFlatConfirmation ? 16 : 0,
>>>>>>> stable:app/components/Views/confirmations/components/rows/transactions/token-hero/token-hero.styles.ts
    },
  });
};

export default styleSheet;
