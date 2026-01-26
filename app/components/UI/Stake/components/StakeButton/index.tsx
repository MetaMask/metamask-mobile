import { toHex } from '@metamask/controller-utils';
import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { useSelector } from 'react-redux';
import { WalletViewSelectorsIDs } from '../../../../Views/Wallet/WalletView.testIds';
import { strings } from '../../../../../../locales/i18n';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import Routes from '../../../../../constants/navigation/Routes';
import AppConstants from '../../../../../core/AppConstants';
import Engine from '../../../../../core/Engine';
import { RootState } from '../../../../../reducers';
import {
  selectEvmChainId,
  selectNetworkConfigurationByChainId,
} from '../../../../../selectors/networkController';
import { getDecimalChainId } from '../../../../../util/networks';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';
import { EARN_EXPERIENCES } from '../../../Earn/constants/experiences';
import useEarnTokens from '../../../Earn/hooks/useEarnTokens';
import {
  selectPooledStakingEnabledFlag,
  selectStablecoinLendingEnabledFlag,
} from '../../../Earn/selectors/featureFlags';
import { TokenI } from '../../../Tokens/types';
import { EVENT_LOCATIONS } from '../../constants/events';
import useStakingChain from '../../hooks/useStakingChain';
import { StakeSDKProvider } from '../../sdk/stakeSdkProvider';
import { Hex } from '@metamask/utils';
import { trace, TraceName } from '../../../../../util/trace';
import { earnSelectors } from '../../../../../selectors/earnController/earn';
///: BEGIN:ONLY_INCLUDE_IF(tron)
import { selectTrxStakingEnabled } from '../../../../../selectors/featureFlagController/trxStakingEnabled';
import { isTronChainId } from '../../../../../core/Multichain/utils';
import useTronStakeApy from '../../../Earn/hooks/useTronStakeApy';
import useStakingEligibility from '../../hooks/useStakingEligibility';
///: END:ONLY_INCLUDE_IF

const styles = StyleSheet.create({
  stakeButton: {
    flexDirection: 'row',
  },
  dot: {
    marginLeft: 2,
    marginRight: 2,
  },
});
interface StakeButtonProps {
  asset: TokenI;
}

// TODO: Rename to EarnCta to better describe this component's purpose.
const StakeButtonContent = ({ asset }: StakeButtonProps) => {
  const navigation = useNavigation();
  const { trackEvent, createEventBuilder } = useMetrics();
  const chainId = useSelector(selectEvmChainId);
  const { isStakingSupportedChain } = useStakingChain();

  const isPooledStakingEnabled = useSelector(selectPooledStakingEnabledFlag);
  const isStablecoinLendingEnabled = useSelector(
    selectStablecoinLendingEnabledFlag,
  );

  ///: BEGIN:ONLY_INCLUDE_IF(tron)
  const isTrxStakingEnabled = useSelector(selectTrxStakingEnabled);
  const isTronNative = asset?.isNative && isTronChainId(asset.chainId as Hex);
  const { apyPercent: tronApyPercent } = useTronStakeApy();
  ///: END:ONLY_INCLUDE_IF
  const network = useSelector((state: RootState) =>
    selectNetworkConfigurationByChainId(state, asset.chainId as Hex),
  );

  const { getEarnToken } = useEarnTokens();
  const earnToken = getEarnToken(asset);

  const primaryExperienceType = useSelector((state: RootState) =>
    earnSelectors.selectPrimaryEarnExperienceTypeForAsset(state, asset),
  );

  const areEarnExperiencesDisabled =
    !isPooledStakingEnabled && !isStablecoinLendingEnabled;

  const handleStakeRedirect = async () => {
    ///: BEGIN:ONLY_INCLUDE_IF(tron)
    if (isTronNative && isTrxStakingEnabled) {
      // Track analytics before eligibility check to preserve behavior
      trackEvent(
        createEventBuilder(MetaMetricsEvents.STAKE_BUTTON_CLICKED)
          .addProperties({
            chain_id: getDecimalChainId(asset.chainId as Hex),
            location: EVENT_LOCATIONS.HOME_SCREEN,
            action_type: 'deposit',
            text: 'Earn',
            token: asset.symbol,
            network: network?.name,
            experience: EARN_EXPERIENCES.POOLED_STAKING,
          })
          .build(),
      );
      trace({ name: TraceName.EarnDepositScreen });
      navigation.navigate('StakeScreens', {
        screen: Routes.STAKING.STAKE,
        params: {
          token: asset,
        },
      });
      return;
    }
    ///: END:ONLY_INCLUDE_IF

    if (!isStakingSupportedChain) {
      await Engine.context.MultichainNetworkController.setActiveNetwork(
        'mainnet',
      );
    }
    // Track analytics before eligibility check to preserve behavior
    trackEvent(
      createEventBuilder(MetaMetricsEvents.STAKE_BUTTON_CLICKED)
        .addProperties({
          chain_id: getDecimalChainId(chainId),
          location: EVENT_LOCATIONS.HOME_SCREEN,
          action_type: 'deposit',
          text: 'Earn',
          token: asset.symbol,
          network: network?.name,
          url: AppConstants.STAKE.URL,
          experience: EARN_EXPERIENCES.POOLED_STAKING,
        })
        .build(),
    );
    trace({ name: TraceName.EarnDepositScreen });
    navigation.navigate('StakeScreens', {
      screen: Routes.STAKING.STAKE,
      params: {
        token: asset,
      },
    });
  };

  const handleLendingRedirect = async () => {
    if (!asset?.chainId) return;

    const networkClientId =
      Engine.context.NetworkController.findNetworkClientIdByChainId(
        toHex(asset.chainId),
      );

    if (!networkClientId) {
      console.error(
        `EarnTokenListItem redirect failed: could not retrieve networkClientId for chainId: ${asset.chainId}`,
      );
      return;
    }

    trace({ name: TraceName.EarnDepositScreen });
    await Engine.context.NetworkController.setActiveNetwork(networkClientId);

    trackEvent(
      createEventBuilder(MetaMetricsEvents.EARN_BUTTON_CLICKED)
        .addProperties({
          action_type: 'deposit',
          location: EVENT_LOCATIONS.HOME_SCREEN,
          network: network?.name,
          text: 'Earn',
          token: asset.symbol,
          experience: EARN_EXPERIENCES.STABLECOIN_LENDING,
        })
        .build(),
    );

    navigation.navigate('StakeScreens', {
      screen: Routes.STAKING.STAKE,
      params: {
        token: asset,
      },
    });
  };

  const onEarnButtonPress = async () => {
    if (primaryExperienceType === EARN_EXPERIENCES.POOLED_STAKING) {
      return handleStakeRedirect();
    }

    if (primaryExperienceType === EARN_EXPERIENCES.STABLECOIN_LENDING) {
      return handleLendingRedirect();
    }
  };

  if (
    areEarnExperiencesDisabled ||
    (primaryExperienceType !== EARN_EXPERIENCES.STABLECOIN_LENDING &&
      !earnToken?.isETH &&
      earnToken?.balanceMinimalUnit === '0') ||
    (earnToken?.isETH && !isPooledStakingEnabled)
  )
    return <></>;

  const renderEarnButtonText = () => {
    ///: BEGIN:ONLY_INCLUDE_IF(tron)
    if (isTronNative && isTrxStakingEnabled && tronApyPercent) {
      return `${strings('stake.earn')} ${tronApyPercent}`;
    }
    ///: END:ONLY_INCLUDE_IF

    const aprNumber = Number(earnToken?.experience?.apr);
    const aprText =
      Number.isFinite(aprNumber) && aprNumber > 0
        ? ` ${aprNumber.toFixed(1)}%`
        : '';
    return `${strings('stake.earn')}${aprText}`;
  };

  return (
    <TouchableOpacity
      onPress={onEarnButtonPress}
      testID={WalletViewSelectorsIDs.STAKE_BUTTON}
      style={styles.stakeButton}
    >
      <Text variant={TextVariant.BodySMMedium} style={styles.dot}>
        {' • '}
      </Text>
      <Text color={TextColor.Primary} variant={TextVariant.BodySMMedium}>
        {renderEarnButtonText()}
      </Text>
    </TouchableOpacity>
  );
};

export const StakeButton = (props: StakeButtonProps) => {
  const { isEligible } = useStakingEligibility();

  if (!isEligible) {
    return null;
  }
  return (
    <StakeSDKProvider>
      <StakeButtonContent {...props} />
    </StakeSDKProvider>
  );
};

export default StakeButton;
