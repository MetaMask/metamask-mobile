import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { View } from 'react-native';
import { strings } from '../../../../../../../locales/i18n';
import Button, {
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../../component-library/components/Buttons/Button';
import Routes from '../../../../../../constants/navigation/Routes';
import { TokenI } from '../../../../Tokens/types';
import { WalletViewSelectorsIDs } from '../../../../../../../e2e/selectors/wallet/WalletView.selectors';

interface StakingEarningsHistoryButtonProps {
  asset: TokenI;
}

const StakingEarningsHistoryButton = ({
  asset,
}: StakingEarningsHistoryButtonProps) => {
  const { navigate } = useNavigation();

  const onViewEarningsHistoryPress = () => {
    navigate('StakeScreens', {
      screen: Routes.STAKING.EARNINGS_HISTORY,
      params: { asset },
    });
  };

  return (
    <View>
      <Button
        testID={WalletViewSelectorsIDs.STAKE_EARNINGS_HISTORY_BUTTON}
        width={ButtonWidthTypes.Full}
        variant={ButtonVariants.Secondary}
        label={strings('stake.view_earnings_history')}
        onPress={onViewEarningsHistoryPress}
      />
    </View>
  );
};

export default StakingEarningsHistoryButton;
