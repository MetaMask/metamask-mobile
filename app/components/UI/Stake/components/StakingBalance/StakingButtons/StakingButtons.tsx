import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { View, ViewProps } from 'react-native';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../../../locales/i18n';
import Button, {
  ButtonVariants,
} from '../../../../../../component-library/components/Buttons/Button';
import { useStyles } from '../../../../../../component-library/hooks';
import Routes from '../../../../../../constants/navigation/Routes';
import Engine from '../../../../../../core/Engine';
import { RootState } from '../../../../../../reducers';
import { earnSelectors } from '../../../../../../selectors/earnController';
import { selectEvmChainId } from '../../../../../../selectors/networkController';
import { MetaMetricsEvents, useMetrics } from '../../../../../hooks/useMetrics';
import { selectPooledStakingEnabledFlag } from '../../../../Earn/selectors/featureFlags';
import { TokenI } from '../../../../Tokens/types';
import { EVENT_LOCATIONS } from '../../../constants/events';
import useStakingChain from '../../../hooks/useStakingChain';
import styleSheet from './StakingButtons.styles';
import { trace, TraceName } from '../../../../../../util/trace';
import useStakingEligibility from '../../../hooks/useStakingEligibility';

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

  const { isEligible } = useStakingEligibility();

  const chainId = useSelector(selectEvmChainId);
  const isPooledStakingEnabled = useSelector(selectPooledStakingEnabledFlag);

  const { isStakingSupportedChain } = useStakingChain();
  const { MultichainNetworkController } = Engine.context;

  const handleIsStakingSupportedChain = async () => {
    if (!isStakingSupportedChain) {
      await MultichainNetworkController.setActiveNetwork('mainnet');
    }
  };

  const { outputToken } = useSelector((state: RootState) =>
    earnSelectors.selectEarnTokenPair(state, asset),
  );

  const onUnstakePress = async () => {
    trace({ name: TraceName.EarnWithdrawScreen });
    await handleIsStakingSupportedChain();
    navigate('StakeScreens', {
      screen: Routes.STAKING.UNSTAKE,
      params: {
        token: outputToken,
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
    trace({ name: TraceName.EarnDepositScreen });
    await handleIsStakingSupportedChain();
    navigate('StakeScreens', {
      screen: Routes.STAKING.STAKE,
      params: {
        token: asset,
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
      {isPooledStakingEnabled && isEligible && (
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
