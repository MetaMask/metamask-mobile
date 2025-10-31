import React from 'react';
import { View, ViewProps } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Button, {
  ButtonVariants,
} from '../../../../../../component-library/components/Buttons/Button';
import { useStyles } from '../../../../../../component-library/hooks';
import Routes from '../../../../../../constants/navigation/Routes';
import { TokenI } from '../../../../Tokens/types';
import styleSheet from './TronStakingButtons.styles';
import { strings } from '../../../../../../../locales/i18n';
import { MetaMetricsEvents, useMetrics } from '../../../../../hooks/useMetrics';
import { EVENT_LOCATIONS } from '../../../../../UI/Stake/constants/events';
import { trace, TraceName } from '../../../../../../util/trace';

interface TronStakingButtonsProps extends Pick<ViewProps, 'style'> {
  asset: TokenI;
  showUnstake?: boolean;
  hasStakedPositions?: boolean;
}

const TronStakingButtons = ({
  asset,
  showUnstake = false,
  hasStakedPositions = false,
}: TronStakingButtonsProps) => {
  const { styles } = useStyles(styleSheet, {});
  const navigation = useNavigation();
  const { trackEvent, createEventBuilder } = useMetrics();

  const isStakedTrx =
    asset?.isStaked || asset?.symbol === 'sTRX' || asset?.ticker === 'sTRX';

  const baseAssetForStake = React.useMemo(
    () =>
      !isStakedTrx
        ? asset
        : // we prefer nativeAsset if present; otherwise synthesize TRX view
          ((asset as TokenI).nativeAsset ?? {
            ...asset,
            name: 'Tron',
            symbol: 'TRX',
            ticker: 'TRX',
            isStaked: false,
          }),
    [asset, isStakedTrx],
  );

  const onStakePress = () => {
    trace({ name: TraceName.EarnDepositScreen });
    navigation.navigate('StakeScreens', {
      screen: Routes.STAKING.STAKE,
      params: { token: baseAssetForStake },
    });
    trackEvent(
      createEventBuilder(MetaMetricsEvents.STAKE_BUTTON_CLICKED)
        .addProperties({
          location: EVENT_LOCATIONS.HOME_SCREEN,
          text: 'Stake',
          token: asset.symbol,
        })
        .build(),
    );
  };

  const onUnstakePress = () => {
    trace({ name: TraceName.EarnWithdrawScreen });
    navigation.navigate('StakeScreens', {
      screen: Routes.STAKING.UNSTAKE,
      params: { token: asset },
    });
  };

  return (
    <View style={styles.balanceButtonsContainer}>
      {showUnstake ? (
        <Button
          testID={'unstake-button'}
          style={styles.balanceActionButton}
          variant={ButtonVariants.Secondary}
          label={strings('stake.unstake')}
          onPress={onUnstakePress}
        />
      ) : null}
      <Button
        testID={'stake-more-button'}
        style={styles.balanceActionButton}
        variant={ButtonVariants.Secondary}
        label={
          hasStakedPositions
            ? strings('stake.stake_more')
            : strings('stake.stake')
        }
        onPress={onStakePress}
      />
    </View>
  );
};

export default TronStakingButtons;
