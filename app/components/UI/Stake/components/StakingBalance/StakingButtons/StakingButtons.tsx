import React from 'react';
import Button, {
  ButtonVariants,
} from '../../../../../../component-library/components/Buttons/Button';
import { strings } from '../../../../../../../locales/i18n';
import { View, ViewProps } from 'react-native';
import { useStyles } from '../../../../../../component-library/hooks';
import styleSheet from './StakingButtons.styles';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../../../constants/navigation/Routes';
import { useMetrics, MetaMetricsEvents } from '../../../../../hooks/useMetrics';
import { useSelector } from 'react-redux';
import { selectChainId } from '../../../../../../selectors/networkController';

interface StakingButtonsProps extends Pick<ViewProps, 'style'> {
  hasStakedPositions: boolean;
  hasEthToUnstake: boolean;
}

const StakingButtons = ({
  style,
  hasStakedPositions,
  hasEthToUnstake,
}: StakingButtonsProps) => {
  const { navigate } = useNavigation();
  const { styles } = useStyles(styleSheet, {});
  const { trackEvent, createEventBuilder } = useMetrics();
  const chainId = useSelector(selectChainId);

  const onUnstakePress = () => {
    navigate('StakeScreens', {
      screen: Routes.STAKING.UNSTAKE,
    });
    trackEvent(
      createEventBuilder(MetaMetricsEvents.STAKE_WITHDRAW_BUTTON_CLICKED)
        .addProperties({
          location: 'Token Details',
          text: 'Unstake',
          token_symbol: 'ETH',
          chain_id: chainId,
        })
        .build(),
    );
  };

  const onStakePress = () => {
    navigate('StakeScreens', { screen: Routes.STAKING.STAKE });
    trackEvent(
      createEventBuilder(MetaMetricsEvents.STAKE_BUTTON_CLICKED)
        .addProperties({
          location: 'Token Details',
          text: 'Stake',
          token_symbol: 'ETH',
          chain_id: chainId,
        })
        .build(),
    );
  };

  return (
    <View style={[styles.balanceButtonsContainer, style]}>
      {hasEthToUnstake && (
        <Button
          style={styles.balanceActionButton}
          variant={ButtonVariants.Secondary}
          label={strings('stake.unstake')}
          onPress={onUnstakePress}
        />
      )}
      <Button
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

export default StakingButtons;
