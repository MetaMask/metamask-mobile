import { toHex } from '@metamask/controller-utils';
import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { Pressable } from 'react-native';
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
import { selectEvmChainId } from '../../../../../selectors/networkController';
import { getDecimalChainId } from '../../../../../util/networks';
import { useTheme } from '../../../../../util/theme';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';
import { EARN_EXPERIENCES } from '../../../Earn/constants/experiences';
import useEarnTokens from '../../../Earn/hooks/useEarnTokens';
import {
  selectPooledStakingEnabledFlag,
  selectStablecoinLendingEnabledFlag,
} from '../../../Earn/selectors/featureFlags';
import createStyles from '../../../Tokens/styles';
import { BrowserTab, TokenI } from '../../../Tokens/types';
import { EVENT_LOCATIONS } from '../../constants/events';
import useStakingChain from '../../hooks/useStakingChain';
import useStakingEligibility from '../../hooks/useStakingEligibility';
import { StakeSDKProvider } from '../../sdk/stakeSdkProvider';

interface StakeButtonProps {
  asset: TokenI;
}

const StakeButtonContent = ({ asset }: StakeButtonProps) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const navigation = useNavigation();
  const { trackEvent, createEventBuilder } = useMetrics();

  const browserTabs = useSelector((state: RootState) => state.browser.tabs);
  const chainId = useSelector(selectEvmChainId);
  const { isEligible } = useStakingEligibility();
  const { isStakingSupportedChain } = useStakingChain();

  const isPooledStakingEnabled = useSelector(selectPooledStakingEnabledFlag);
  const isStablecoinLendingEnabled = useSelector(
    selectStablecoinLendingEnabledFlag,
  );

  const { getEarnToken } = useEarnTokens();
  const earnToken = getEarnToken(asset);

  const areEarnExperiencesDisabled =
    !isPooledStakingEnabled && !isStablecoinLendingEnabled;

  const handleStakeRedirect = async () => {
    if (!isStakingSupportedChain) {
      await Engine.context.MultichainNetworkController.setActiveNetwork(
        'mainnet',
      );
    }
    if (isEligible) {
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
          text: 'Stake',
          token_symbol: asset.symbol,
          url: AppConstants.STAKE.URL,
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

    await Engine.context.NetworkController.setActiveNetwork(networkClientId);

    navigation.navigate('StakeScreens', {
      screen: Routes.STAKING.STAKE,
      params: {
        token: asset,
      },
    });
  };

  const onEarnButtonPress = async () => {
    if (earnToken?.experience?.type === EARN_EXPERIENCES.POOLED_STAKING) {
      return handleStakeRedirect();
    }

    if (earnToken?.experience?.type === EARN_EXPERIENCES.STABLECOIN_LENDING) {
      return handleLendingRedirect();
    }
  };

  if (
    areEarnExperiencesDisabled ||
    (!earnToken?.isETH && earnToken?.balanceMinimalUnit === '0')
  )
    return <></>;

  return (
    <Pressable
      onPress={onEarnButtonPress}
      testID={WalletViewSelectorsIDs.STAKE_BUTTON}
      style={styles.stakeButton}
    >
      <Text variant={TextVariant.BodySMMedium} style={styles.dot}>
        {' • '}
      </Text>
      <Text color={TextColor.Primary} variant={TextVariant.BodySMMedium}>
        {`${strings('stake.earn')}`}{' '}
        {parseFloat(earnToken?.experience?.apr || '').toFixed(1)}%
      </Text>
    </Pressable>
  );
};

// TODO: Rename to EarnButton and make component more generic to support lending.
export const StakeButton = (props: StakeButtonProps) => (
  <StakeSDKProvider>
    <StakeButtonContent {...props} />
  </StakeSDKProvider>
);

export default StakeButton;
