import React from 'react';
import { TokenI, BrowserTab } from '../../../Tokens/types';
import { useNavigation } from '@react-navigation/native';
import { isPooledStakingFeatureEnabled } from '../../constants';
import Routes from '../../../../../constants/navigation/Routes';
import { useSelector } from 'react-redux';
import AppConstants from '../../../../../core/AppConstants';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';
import { getDecimalChainId } from '../../../../../util/networks';
import { selectChainId } from '../../../../../selectors/networkController';
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

interface StakeButtonProps {
  asset: TokenI;
}
const StakeButtonContent = ({ asset }: StakeButtonProps) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const navigation = useNavigation();
  const { trackEvent, createEventBuilder } = useMetrics();

  const browserTabs = useSelector((state: RootState) => state.browser.tabs);
  const chainId = useSelector(selectChainId);

  const { refreshPooledStakingEligibility } = useStakingEligibility();

  const onStakeButtonPress = async () => {
    const { isEligible } = await refreshPooledStakingEligibility();
    if (isPooledStakingFeatureEnabled() && isEligible) {
      navigation.navigate('StakeScreens', { screen: Routes.STAKING.STAKE });
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
          location: 'Home Screen',
          text: 'Stake',
          token_symbol: asset.symbol,
          url: AppConstants.STAKE.URL,
        })
        .build(),
    );
  };

  return (
    <Pressable
      onPress={onStakeButtonPress}
      testID={WalletViewSelectorsIDs.STAKE_BUTTON}
      style={styles.stakeButton}
    >
      <Text variant={TextVariant.BodyLGMedium}>
        {' • '}
        <Text color={TextColor.Primary} variant={TextVariant.BodyLGMedium}>
          {isPooledStakingFeatureEnabled()
            ? `${strings('stake.earn')} `
            : `${strings('stake.stake')} `}
        </Text>
      </Text>
      <Icon
        name={IconName.Plant}
        size={IconSize.Sm}
        color={IconColor.Primary}
      />
    </Pressable>
  );
};

export const StakeButton = (props: StakeButtonProps) => (
  <StakeSDKProvider>
    <StakeButtonContent {...props} />
  </StakeSDKProvider>
);

export default StakeButton;
