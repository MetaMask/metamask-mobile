import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../../core/NavigationService/types';
import React from 'react';
import { View, ViewProps } from 'react-native';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../../../locales/i18n';
import { useStyles } from '../../../../../../component-library/hooks';
import Routes from '../../../../../../constants/navigation/Routes';
import Engine from '../../../../../../core/Engine';
import { RootState } from '../../../../../../reducers';
import { earnSelectors } from '../../../../../../selectors/earnController';
import { selectEvmChainId } from '../../../../../../selectors/networkController';
import { MetaMetricsEvents } from '../../../../../../core/Analytics';
import { useAnalytics } from '../../../../../hooks/useAnalytics/useAnalytics';
import { selectPooledStakingEnabledFlag } from '../../../../Earn/selectors/featureFlags';
import useEarnToasts from '../../../../Earn/hooks/useEarnToasts';
import { TokenI } from '../../../../Tokens/types';
import { EVENT_LOCATIONS } from '../../../constants/events';
import useStakingChain from '../../../hooks/useStakingChain';
import styleSheet from './StakingButtons.styles';
import { trace, TraceName } from '../../../../../../util/trace';
import Logger from '../../../../../../util/Logger';
import useStakingEligibility from '../../../hooks/useStakingEligibility';
import {
  ButtonSize,
  ButtonVariant,
  Text,
} from '@metamask/design-system-react-native';
import ButtonGlass from '../../../../../../component-library/components-temp/ButtonGlass';

interface StakingButtonsProps extends Pick<ViewProps, 'style'> {
  asset: TokenI;
  hasStakedPositions: boolean;
  hasEthToUnstake: boolean;
  /** Draws the buttons on brand refresh glass. */
  isGlass?: boolean;
}

const StakingButtons = ({
  style,
  asset,
  hasStakedPositions,
  hasEthToUnstake,
  isGlass = false,
}: StakingButtonsProps) => {
  const { navigate } = useNavigation<AppNavigationProp>();

  const { styles } = useStyles(styleSheet, {});

  const { trackEvent, createEventBuilder } = useAnalytics();
  const { showToast, EarnToastOptions } = useEarnToasts();

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
    if (!outputToken) {
      Logger.error(
        new Error('Pooled staking unstake output token unavailable'),
        {
          chainId: asset.chainId,
          hasEthToUnstake,
          isETH: asset.isETH,
          isStaked: asset.isStaked,
          ticker: asset.ticker,
        },
      );
      showToast(EarnToastOptions.earnWithdrawal.detailsUnavailable);
      return;
    }

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
        <ButtonGlass
          isGlass={isGlass}
          testID={'unstake-button'}
          containerStyle={styles.balanceActionButton}
          variant={ButtonVariant.Secondary}
          onPress={onUnstakePress}
          size={ButtonSize.Md}
        >
          <Text>{strings('stake.unstake')}</Text>
        </ButtonGlass>
      )}
      {isPooledStakingEnabled && isEligible && (
        <ButtonGlass
          isGlass={isGlass}
          testID={'stake-more-button'}
          containerStyle={styles.balanceActionButton}
          variant={ButtonVariant.Secondary}
          onPress={onStakePress}
          size={ButtonSize.Md}
        >
          <Text>
            {hasStakedPositions
              ? strings('stake.stake_more')
              : strings('stake.stake')}
          </Text>
        </ButtonGlass>
      )}
    </View>
  );
};

export default StakingButtons;
