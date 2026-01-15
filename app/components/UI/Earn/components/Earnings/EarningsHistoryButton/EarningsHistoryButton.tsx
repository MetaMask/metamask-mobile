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
import { WalletViewSelectorsIDs } from '../../../../../Views/Wallet/WalletView.testIds';
import { useSelector } from 'react-redux';
import { earnSelectors } from '../../../../../../selectors/earnController';
import { EARN_EXPERIENCES } from '../../../constants/experiences';
import { RootState } from '../../../../../../reducers';

interface EarningsHistoryButtonProps {
  asset: TokenI;
}

const EarningsHistoryButton = ({ asset }: EarningsHistoryButtonProps) => {
  const { navigate } = useNavigation();

  const { outputToken } = useSelector((state: RootState) =>
    earnSelectors.selectEarnTokenPair(state, asset),
  );
  const onViewEarningsHistoryPress = () => {
    navigate('StakeScreens', {
      screen: Routes.STAKING.EARNINGS_HISTORY,
      params: { asset },
    });
  };

  return (
    <View>
      <Button
        testID={WalletViewSelectorsIDs.EARN_EARNINGS_HISTORY_BUTTON}
        width={ButtonWidthTypes.Full}
        variant={ButtonVariants.Secondary}
        label={
          outputToken?.experience?.type === EARN_EXPERIENCES.STABLECOIN_LENDING
            ? strings('earn.view_earnings_history.lending')
            : strings('earn.view_earnings_history.staking')
        }
        onPress={onViewEarningsHistoryPress}
      />
    </View>
  );
};

export default EarningsHistoryButton;
