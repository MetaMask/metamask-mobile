import React from 'react';
import { View } from 'react-native';
import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
import { TokenI } from '../../../Tokens/types';
import styleSheet from './EarnLendingBalance.styles';
import { useStyles } from '../../../../hooks/useStyles';
import { strings } from '../../../../../../locales/i18n';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../../constants/navigation/Routes';
import { useSelector } from 'react-redux';
import { selectStablecoinLendingEnabledFlag } from '../../selectors/featureFlags';

export interface EarnLendingBalanceProps {
  asset: TokenI;
}

const EarnLendingBalance = ({ asset }: EarnLendingBalanceProps) => {
  const { styles } = useStyles(styleSheet, {});

  const isStablecoinLendingEnabled = useSelector(
    selectStablecoinLendingEnabledFlag,
  );

  const navigation = useNavigation();

  const handleNavigateToWithdrawalInputScreen = () => {
    navigation.navigate('StakeScreens', {
      screen: Routes.STAKING.UNSTAKE,
      params: {
        token: asset,
      },
    });
  };

  const handleNavigateToDepositInputScreen = () => {
    navigation.navigate('StakeScreens', {
      screen: Routes.STAKING.STAKE,
      params: {
        token: asset,
      },
    });
  };

  if (!isStablecoinLendingEnabled) return null;

  return (
    <View style={styles.container}>
      <Button
        variant={ButtonVariants.Secondary}
        style={styles.button}
        size={ButtonSize.Lg}
        label={strings('earn.withdraw')}
        onPress={handleNavigateToWithdrawalInputScreen}
      />
      <Button
        variant={ButtonVariants.Secondary}
        style={styles.button}
        size={ButtonSize.Lg}
        label={strings('earn.deposit_more')}
        onPress={handleNavigateToDepositInputScreen}
      />
    </View>
  );
};
export default EarnLendingBalance;
