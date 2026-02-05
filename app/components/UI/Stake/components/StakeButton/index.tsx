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
import {
  selectPooledStakingEnabledFlag,
  selectStablecoinLendingEnabledFlag,
} from '../../../Earn/selectors/featureFlags';
import { useStablecoinLendingRedirect } from '../../../Earn/hooks/useStablecoinLendingRedirect';
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
import BigNumber from 'bignumber.js';
import { MINIMUM_BALANCE_FOR_EARN_CTA } from '../../../Earn/constants/token';
import useEarnToken from '../../../Earn/hooks/useEarnToken';
import { EarnTokenDetails } from '../../../Earn/types/lending.types';

const styles = StyleSheet.create({
  stakeButton: {
    flexDirection: 'row',
  },
  dot: {
    marginLeft: 2,
    marginRight: 2,
  },
});

interface StakeButtonContentProps {
  earnToken: EarnTokenDetails;
}

// TODO: Rename to EarnCta to better describe this component's purpose.
const StakeButtonContent = ({ earnToken }: StakeButtonContentProps) => {
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
  const isTronNative =
    earnToken?.isNative && isTronChainId(earnToken.chainId as Hex);
  const { apyPercent: tronApyPercent } = useTronStakeApy();
  ///: END:ONLY_INCLUDE_IF
  const network = useSelector((state: RootState) =>
    selectNetworkConfigurationByChainId(state, earnToken?.chainId as Hex),
  );

  const primaryExperienceType = useSelector((state: RootState) =>
    earnSelectors.selectPrimaryEarnExperienceTypeForAsset(state, earnToken),
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
            chain_id: getDecimalChainId(earnToken.chainId as Hex),
            location: EVENT_LOCATIONS.HOME_SCREEN,
            action_type: 'deposit',
            text: 'Earn',
            token: earnToken.symbol,
            network: network?.name,
            experience: EARN_EXPERIENCES.POOLED_STAKING,
          })
          .build(),
      );
      trace({ name: TraceName.EarnDepositScreen });
      navigation.navigate('StakeScreens', {
        screen: Routes.STAKING.STAKE,
        params: {
          token: earnToken,
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
          token: earnToken.symbol,
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
        token: earnToken,
      },
    });
  };

  const handleLendingRedirect = useStablecoinLendingRedirect({
    asset: earnToken,
    location: EVENT_LOCATIONS.HOME_SCREEN,
  });

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

interface StakeButtonProps {
  asset: TokenI;
}

export const StakeButton = (props: StakeButtonProps) => {
  const { isEligible } = useStakingEligibility();
  const { earnToken } = useEarnToken(props.asset);

  if (!isEligible || !earnToken) {
    return null;
  }

  if (
    new BigNumber(earnToken?.balanceFiatNumber || '0').lt(
      MINIMUM_BALANCE_FOR_EARN_CTA,
    )
  ) {
    return null;
  }

  return (
    <StakeSDKProvider>
      <StakeButtonContent earnToken={earnToken} />
    </StakeSDKProvider>
  );
};

export default StakeButton;
