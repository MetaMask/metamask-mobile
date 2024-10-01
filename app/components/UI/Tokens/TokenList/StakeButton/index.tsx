import React from 'react';
import { TokenI, BrowserTab } from '../../types';
import { useNavigation } from '@react-navigation/native';
import { isPooledStakingFeatureEnabled } from '../../../Stake/constants';
import Routes from '../../../../../constants/navigation/Routes';
import { useSelector } from 'react-redux';
import AppConstants from '../../../../../core/AppConstants';
import {
  MetaMetricsEvents,
  useMetrics,
} from '../../../../../components/hooks/useMetrics';
import { getDecimalChainId } from '../../../../../util/networks';
import { selectChainId } from '../../../../../selectors/networkController';
import { Pressable } from 'react-native';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { WalletViewSelectorsIDs } from '../../../../../../e2e/selectors/wallet/WalletView.selectors';
import { useTheme } from '../../../../../util/theme';
import createStyles from '../../styles';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import { strings } from '../../../../../../locales/i18n';

interface StakeButtonProps {
  asset: TokenI;
}

export const StakeButton = ({ asset }: StakeButtonProps) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const navigation = useNavigation<StackNavigationProp<any>>();
  const { trackEvent } = useMetrics();

  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const browserTabs = useSelector((state: any) => state.browser.tabs);
  const chainId = useSelector(selectChainId);

  const onStakeButtonPress = () => {
    if (isPooledStakingFeatureEnabled()) {
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
    trackEvent(MetaMetricsEvents.STAKE_BUTTON_CLICKED, {
      chain_id: getDecimalChainId(chainId),
      location: 'Home Screen',
      text: 'Stake',
      token_symbol: asset.symbol,
      url: AppConstants.STAKE.URL,
    });
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
          {`${strings('stake.stake')} `}
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
