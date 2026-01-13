import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { View } from 'react-native';
import { strings } from '../../../../../../../locales/i18n';
import { useStyles } from '../../../../../../component-library/hooks';
import styleSheet from './EarningsHistoryButton.styles';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../../component-library/components/Buttons/Button';
import Routes from '../../../../../../constants/navigation/Routes';
import { TokenI } from '../../../../Tokens/types';
import { WalletViewSelectorsIDs } from '../../../../../../../e2e/selectors/wallet/WalletView.selectors';
import { useSelector } from 'react-redux';
import { earnSelectors } from '../../../../../../selectors/earnController';
import { EARN_EXPERIENCES } from '../../../constants/experiences';
import { RootState } from '../../../../../../reducers';

interface EarningsHistoryButtonProps {
  asset: TokenI;
}

const EarningsHistoryButton = ({ asset }: EarningsHistoryButtonProps) => {
  const { navigate } = useNavigation();
  const { styles } = useStyles(styleSheet, {});

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
    <View style={styles.container}>
      <Button
        testID={WalletViewSelectorsIDs.EARN_EARNINGS_HISTORY_BUTTON}
        width={ButtonWidthTypes.Full}
        variant={ButtonVariants.Secondary}
        size={ButtonSize.Lg}
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
