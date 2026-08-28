import React, { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  BoxAlignItems,
  BoxBackgroundColor,
  BoxFlexDirection,
  ButtonFilter,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { SocialTradingFeed } from '../SocialTradingFeed/SocialTradingFeed';
import { SocialTradingLeaderboard } from '../SocialTradingLeaderboard/SocialTradingLeaderboard';
import { SocialTradingPortfolio } from '../SocialTradingPortfolio/SocialTradingPortfolio';

type SocialTradingTab = 'feed' | 'leaderboard' | 'portfolio';

/**
 * Root view of the Social Trading prototype. Hosts the feed, leaderboard,
 * and simulated portfolio behind local tab state, with a persistent
 * prototype/mock-data disclosure banner.
 */
export function SocialTradingView() {
  const navigation = useNavigation<AppNavigationProp>();
  const [tab, setTab] = useState<SocialTradingTab>('feed');

  const onPressTrader = (traderId: string) => {
    navigation.navigate(Routes.SOCIAL_TRADING.TRADER_PROFILE, { traderId });
  };

  return (
    <Box
      twClassName="flex-1"
      backgroundColor={BoxBackgroundColor.BackgroundDefault}
      testID="social-trading-view"
    >
      {/* Prototype disclosure */}
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        backgroundColor={BoxBackgroundColor.WarningMuted}
        paddingHorizontal={4}
        paddingVertical={2}
        gap={2}
      >
        <Icon
          name={IconName.Warning}
          size={IconSize.Sm}
          color={IconColor.WarningDefault}
        />
        <Text
          variant={TextVariant.BodyXs}
          color={TextColor.TextAlternative}
          twClassName="flex-1"
        >
          {strings('social_trading.prototype_banner')}
        </Text>
      </Box>

      {/* Tabs */}
      <Box
        flexDirection={BoxFlexDirection.Row}
        gap={2}
        paddingHorizontal={4}
        paddingVertical={3}
      >
        <ButtonFilter
          isActive={tab === 'feed'}
          onPress={() => setTab('feed')}
          testID="social-trading-tab-feed"
        >
          {strings('social_trading.tabs.feed')}
        </ButtonFilter>
        <ButtonFilter
          isActive={tab === 'leaderboard'}
          onPress={() => setTab('leaderboard')}
          testID="social-trading-tab-leaderboard"
        >
          {strings('social_trading.tabs.leaderboard')}
        </ButtonFilter>
        <ButtonFilter
          isActive={tab === 'portfolio'}
          onPress={() => setTab('portfolio')}
          testID="social-trading-tab-portfolio"
        >
          {strings('social_trading.tabs.portfolio')}
        </ButtonFilter>
      </Box>

      {tab === 'feed' ? (
        <SocialTradingFeed onPressTrader={onPressTrader} />
      ) : null}
      {tab === 'leaderboard' ? (
        <SocialTradingLeaderboard onPressTrader={onPressTrader} />
      ) : null}
      {tab === 'portfolio' ? (
        <SocialTradingPortfolio onPressTrader={onPressTrader} />
      ) : null}
    </Box>
  );
}

export default SocialTradingView;
