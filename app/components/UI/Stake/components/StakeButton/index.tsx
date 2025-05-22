import React from 'react';
import { TokenI, BrowserTab } from '../../../Tokens/types';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../../constants/navigation/Routes';
import { useSelector } from 'react-redux';
import AppConstants from '../../../../../core/AppConstants';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';
import { getDecimalChainId } from '../../../../../util/networks';
import { selectEvmChainId } from '../../../../../selectors/networkController';
import { Pressable } from 'react-native';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { WalletViewSelectorsIDs } from '../../../../../../e2e/selectors/wallet/WalletView.selectors';
import { useTheme } from '../../../../../util/theme';
import createStyles from '../../../Tokens/styles';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import { strings } from '../../../../../../locales/i18n';
import { RootState } from '../../../../../reducers';
import useStakingEligibility from '../../hooks/useStakingEligibility';
import { StakeSDKProvider } from '../../sdk/stakeSdkProvider';
import { EVENT_LOCATIONS } from '../../constants/events';
import useStakingChain from '../../hooks/useStakingChain';
import Engine from '../../../../../core/Engine';
import { EARN_INPUT_VIEW_ACTIONS } from '../../../Earn/Views/EarnInputView/EarnInputView.types';
import {
  selectPooledStakingEnabledFlag,
  selectStablecoinLendingEnabledFlag,
} from '../../../Earn/selectors/featureFlags';
import { useEarnTokenDetails } from '../../../Earn/hooks/useEarnTokenDetails';
import { EARN_EXPERIENCES } from '../../../Earn/constants/experiences';
import { toHex } from '@metamask/controller-utils';

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

  const { getTokenWithBalanceAndApr } = useEarnTokenDetails();

  const earnToken = getTokenWithBalanceAndApr(asset);

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
          action: EARN_INPUT_VIEW_ACTIONS.STAKE,
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
    if (earnToken.experience === EARN_EXPERIENCES.POOLED_STAKING) {
      return handleStakeRedirect();
    }

    if (earnToken.experience === EARN_EXPERIENCES.STABLECOIN_LENDING) {
      return handleLendingRedirect();
    }
  };

  if (areEarnExperiencesDisabled) return <></>;

  return (
    <Pressable
      onPress={onEarnButtonPress}
      testID={WalletViewSelectorsIDs.STAKE_BUTTON}
      style={styles.stakeButton}
    >
      <Text variant={TextVariant.BodyMDMedium} style={styles.dot}>
        {' • '}
      </Text>
      <Text color={TextColor.Primary} variant={TextVariant.BodyMDMedium}>
        {`${strings('stake.earn')}`}
      </Text>
      <Icon
        name={IconName.Plant}
        size={IconSize.Sm}
        color={IconColor.Primary}
        style={styles.sprout}
      />
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
