import { toHex } from '@metamask/controller-utils';
import { useNavigation } from '@react-navigation/native';
import React, { useCallback } from 'react';
import { Alert, TouchableOpacity } from 'react-native';
import { useSelector } from 'react-redux';
import { WalletViewSelectorsIDs } from '../../../../../../e2e/selectors/wallet/WalletView.selectors';
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
import { useTheme } from '../../../../../util/theme';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';
import { EARN_EXPERIENCES } from '../../../Earn/constants/experiences';
import useEarnTokens from '../../../Earn/hooks/useEarnTokens';
import {
  selectStablecoinLendingEnabledFlag,
  selectIsMusdConversionFlowEnabledFlag,
} from '../../../Earn/selectors/featureFlags';
import {
  useFeatureFlag,
  FeatureFlagNames,
} from '../../../../../components/hooks/useFeatureFlag';
import createStyles from '../../../Tokens/styles';
import { BrowserTab, TokenI } from '../../../Tokens/types';
import { EVENT_LOCATIONS } from '../../constants/events';
import useStakingChain from '../../hooks/useStakingChain';
import useStakingEligibility from '../../hooks/useStakingEligibility';
import { StakeSDKProvider } from '../../sdk/stakeSdkProvider';
import { Hex } from '@metamask/utils';
import { trace, TraceName } from '../../../../../util/trace';
import { earnSelectors } from '../../../../../selectors/earnController/earn';
///: BEGIN:ONLY_INCLUDE_IF(tron)
import { selectTrxStakingEnabled } from '../../../../../selectors/featureFlagController/trxStakingEnabled';
///: END:ONLY_INCLUDE_IF
import { useMusdConversion } from '../../../Earn/hooks/useMusdConversion';
import Logger from '../../../../../util/Logger';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { useMusdConversionTokens } from '../../../Earn/hooks/useMusdConversionTokens';

interface StakeButtonProps {
  asset: TokenI;
}

// TODO: Rename to EarnCta to better describe this component's purpose.
const StakeButtonContent = ({ asset }: StakeButtonProps) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const navigation = useNavigation();
  const { trackEvent, createEventBuilder } = useMetrics();

  const browserTabs = useSelector((state: RootState) => state.browser.tabs);
  const chainId = useSelector(selectEvmChainId);
  const { isEligible } = useStakingEligibility();
  const { isStakingSupportedChain } = useStakingChain();

  const isPooledStakingEnabled = useFeatureFlag(
    FeatureFlagNames.earnPooledStakingEnabled,
  );
  const isStablecoinLendingEnabled = useSelector(
    selectStablecoinLendingEnabledFlag,
  );
  const isMusdConversionFlowEnabled = useSelector(
    selectIsMusdConversionFlowEnabledFlag,
  );

  ///: BEGIN:ONLY_INCLUDE_IF(tron)
  const isTrxStakingEnabled = useSelector(selectTrxStakingEnabled);
  const isTronNative =
    asset?.ticker === 'TRX' && asset?.chainId?.startsWith('tron:');
  ///: END:ONLY_INCLUDE_IF
  const network = useSelector((state: RootState) =>
    selectNetworkConfigurationByChainId(state, asset.chainId as Hex),
  );

  const { getEarnToken } = useEarnTokens();
  const earnToken = getEarnToken(asset);

  const primaryExperienceType = useSelector((state: RootState) =>
    earnSelectors.selectPrimaryEarnExperienceTypeForAsset(state, asset),
  );

  const { initiateConversion, hasSeenMusdEducationScreen } =
    useMusdConversion();
  const { isConversionToken } = useMusdConversionTokens();

  const isConvertibleStablecoin =
    isMusdConversionFlowEnabled && isConversionToken(asset);

  const areEarnExperiencesDisabled =
    !isPooledStakingEnabled && !isStablecoinLendingEnabled;

  const handleStakeRedirect = async () => {
    ///: BEGIN:ONLY_INCLUDE_IF(tron)
    if (isTronNative && isTrxStakingEnabled) {
      trace({ name: TraceName.EarnDepositScreen });
      navigation.navigate('StakeScreens', {
        screen: Routes.STAKING.STAKE,
        params: {
          token: asset,
        },
      });

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
      return;
    }
    ///: END:ONLY_INCLUDE_IF

    if (!isStakingSupportedChain) {
      await Engine.context.MultichainNetworkController.setActiveNetwork(
        'mainnet',
      );
    }
    if (isEligible) {
      trace({ name: TraceName.EarnDepositScreen });
      navigation.navigate('StakeScreens', {
        screen: Routes.STAKING.STAKE,
        params: {
          token: asset,
        },
      });
    } else {
      const existingStakeTab = browserTabs.find((tab: BrowserTab) =>
        tab.url.includes(AppConstants.STAKE.URL),
      );
      let existingTabId;
      let newTabUrl;
      if (existingStakeTab) {
        existingTabId = existingStakeTab.id;
      } else {
        newTabUrl = `${AppConstants.STAKE.URL}?metamaskEntry=mobile`;
      }
      const params = {
        ...(newTabUrl && { newTabUrl }),
        ...(existingTabId && { existingTabId, newTabUrl: undefined }),
        timestamp: Date.now(),
      };
      navigation.navigate(Routes.BROWSER.HOME, {
        screen: Routes.BROWSER.VIEW,
        params,
      });
    }
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

  const handleConvertToMUSD = useCallback(async () => {
    try {
      if (!asset?.address || !asset?.chainId) {
        throw new Error('Asset address or chain ID is not set');
      }

      const config = {
        outputChainId: CHAIN_IDS.MAINNET,
        preferredPaymentToken: {
          address: toHex(asset.address),
          chainId: toHex(asset.chainId),
        },
        navigationStack: Routes.EARN.ROOT,
      };

      if (!hasSeenMusdEducationScreen) {
        navigation.navigate(config.navigationStack, {
          screen: Routes.EARN.MUSD.CONVERSION_EDUCATION,
          params: {
            preferredPaymentToken: config.preferredPaymentToken,
            outputChainId: config.outputChainId,
          },
        });
        return;
      }

      await initiateConversion(config);
    } catch (error) {
      Logger.error(
        error as Error,
        '[mUSD Conversion] Failed to initiate conversion',
      );

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      Alert.alert(
        'Conversion Failed',
        `Unable to start mUSD conversion: ${errorMessage}`,
        [{ text: 'OK' }],
      );
    }
  }, [
    asset.address,
    asset.chainId,
    hasSeenMusdEducationScreen,
    initiateConversion,
    navigation,
  ]);

  const onEarnButtonPress = async () => {
    if (isConvertibleStablecoin) {
      return handleConvertToMUSD();
    }

    if (primaryExperienceType === EARN_EXPERIENCES.POOLED_STAKING) {
      return handleStakeRedirect();
    }

    if (primaryExperienceType === EARN_EXPERIENCES.STABLECOIN_LENDING) {
      return handleLendingRedirect();
    }
  };

  if (
    areEarnExperiencesDisabled ||
    (!isConvertibleStablecoin && // Show for convertible stablecoins even with 0 balance
      !earnToken?.isETH &&
      earnToken?.balanceMinimalUnit === '0') ||
    (earnToken?.isETH && !isPooledStakingEnabled)
  )
    return <></>;

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
        {(() => {
          if (isConvertibleStablecoin) {
            return strings('asset_overview.convert');
          }

          const aprNumber = Number(earnToken?.experience?.apr);
          const aprText =
            Number.isFinite(aprNumber) && aprNumber > 0
              ? ` ${aprNumber.toFixed(1)}%`
              : '';
          return `${strings('stake.earn')}${aprText}`;
        })()}
      </Text>
    </TouchableOpacity>
  );
};

// TODO: Rename to EarnButton and make component more generic to support lending.
export const StakeButton = (props: StakeButtonProps) => (
  <StakeSDKProvider>
    <StakeButtonContent {...props} />
  </StakeSDKProvider>
);

export default StakeButton;
