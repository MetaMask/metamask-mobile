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
import { selectEvmChainId } from '../../../../../../selectors/networkController';
import { EVENT_LOCATIONS } from '../../../constants/events';
import useStakingChain from '../../../hooks/useStakingChain';
import Engine from '../../../../../../core/Engine';
import { EARN_INPUT_VIEW_ACTIONS } from '../../../../Earn/Views/EarnInputView/EarnInputView.types';
import { TokenI } from '../../../../Tokens/types';
import { selectPooledStakingEnabledFlag } from '../../../../../../selectors/featureFlagController/earnFeatureFlags';

interface StakingButtonsProps extends Pick<ViewProps, 'style'> {
  asset: TokenI;
  hasStakedPositions: boolean;
  hasEthToUnstake: boolean;
}

const StakingButtons = ({
  style,
  asset,
  hasStakedPositions,
  hasEthToUnstake,
}: StakingButtonsProps) => {
  const { navigate } = useNavigation();

  const { styles } = useStyles(styleSheet, {});

  const { trackEvent, createEventBuilder } = useMetrics();

  const chainId = useSelector(selectEvmChainId);
  const isPooledStakingEnabled = useSelector(selectPooledStakingEnabledFlag);

  const { isStakingSupportedChain } = useStakingChain();

  const { MultichainNetworkController } = Engine.context;

  const handleIsStakingSupportedChain = async () => {
    if (!isStakingSupportedChain) {
      await MultichainNetworkController.setActiveNetwork('mainnet');
    }
  };

  const onUnstakePress = async () => {
    await handleIsStakingSupportedChain();
    navigate('StakeScreens', {
      screen: Routes.STAKING.UNSTAKE,
      params: {
        token: asset,
      },
    });
    trackEvent(
      createEventBuilder(MetaMetricsEvents.STAKE_WITHDRAW_BUTTON_CLICKED)
        .addProperties({
          location: EVENT_LOCATIONS.TOKEN_DETAILS,
          text: 'Unstake',
          token_symbol: 'ETH',
          chain_id: chainId,
        })
        .build(),
    );
  };

  const onStakePress = async () => {
    await handleIsStakingSupportedChain();
    navigate('StakeScreens', {
      screen: Routes.STAKING.STAKE,
      params: {
        token: asset,
        action: EARN_INPUT_VIEW_ACTIONS.STAKE,
      },
    });
    trackEvent(
      createEventBuilder(MetaMetricsEvents.STAKE_BUTTON_CLICKED)
        .addProperties({
          location: EVENT_LOCATIONS.TOKEN_DETAILS,
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
          testID={'unstake-button'}
          style={styles.balanceActionButton}
          variant={ButtonVariants.Secondary}
          label={strings('stake.unstake')}
          onPress={onUnstakePress}
        />
      )}
      {isPooledStakingEnabled && (
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
      )}
    </View>
  );
};

export default StakingButtons;
