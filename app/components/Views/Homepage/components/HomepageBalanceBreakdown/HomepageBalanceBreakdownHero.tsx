import React from 'react';
import Animated from 'react-native-reanimated';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  ButtonBase,
  FontWeight,
  SensitiveText,
  SensitiveTextLength,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { Skeleton } from '../../../../../component-library/components-temp/Skeleton';
import BalanceEmptyState from '../../../../UI/BalanceEmptyState';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { WalletViewSelectorsIDs } from '../../../Wallet/WalletView.testIds';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import type { HeroData } from '../../../BalanceBreakdown/types';
import { HomepageBalanceBreakdownTestIds } from './HomepageBalanceBreakdown.testIds';
import { useHomepageBalanceBreakdownHero } from './useHomepageBalanceBreakdownHero';

interface HomepageBalanceBreakdownHeroProps {
  hero: HeroData;
}

const HomepageBalanceBreakdownHero = ({
  hero,
}: HomepageBalanceBreakdownHeroProps) => {
  const {
    amountText,
    animatedBalanceStyle,
    deltaColor,
    displayBalance,
    isLoading,
    percentText,
    privacyMode,
    shouldShowEmptyState,
    togglePrivacy,
  } = useHomepageBalanceBreakdownHero(hero);

  if (!isLoading && shouldShowEmptyState) {
    return (
      <Box marginHorizontal={4}>
        <BalanceEmptyState
          testID={WalletViewSelectorsIDs.BALANCE_EMPTY_STATE_CONTAINER}
        />
      </Box>
    );
  }

  return (
    <ButtonBase
      onPress={togglePrivacy}
      testID={HomepageBalanceBreakdownTestIds.HERO}
      twClassName="mx-4 items-start gap-1"
    >
      <Skeleton hideChildren={isLoading}>
        <Animated.View style={animatedBalanceStyle}>
          <SensitiveText
            color={
              hero.isPartiallyLoaded
                ? TextColor.TextMuted
                : TextColor.TextDefault
            }
            isHidden={privacyMode}
            length={SensitiveTextLength.Long}
            testID={WalletViewSelectorsIDs.TOTAL_BALANCE_TEXT}
            variant={TextVariant.DisplayLg}
          >
            {displayBalance}
          </SensitiveText>
        </Animated.View>
      </Skeleton>

      {hero.delta && amountText ? (
        <Skeleton hideChildren={isLoading}>
          <Box
            alignItems={BoxAlignItems.Center}
            flexDirection={BoxFlexDirection.Row}
            twClassName="gap-1.5"
          >
            <SensitiveText
              color={deltaColor}
              fontWeight={FontWeight.Medium}
              isHidden={privacyMode}
              length={SensitiveTextLength.Medium}
              testID={HomepageBalanceBreakdownTestIds.HERO_DELTA_AMOUNT}
              variant={TextVariant.BodyMd}
            >
              {amountText}
            </SensitiveText>
            {percentText ? (
              <SensitiveText
                color={deltaColor}
                fontWeight={FontWeight.Medium}
                isHidden={privacyMode}
                length={SensitiveTextLength.Medium}
                testID={HomepageBalanceBreakdownTestIds.HERO_DELTA_PERCENT}
                variant={TextVariant.BodyMd}
              >
                {percentText}
              </SensitiveText>
            ) : null}
            <Text
              color={TextColor.TextAlternative}
              testID={HomepageBalanceBreakdownTestIds.HERO_PERIOD}
              variant={TextVariant.BodyMd}
            >
              {strings('asset_overview.chart_time_period.1d')}
            </Text>
          </Box>
        </Skeleton>
      ) : null}
    </ButtonBase>
  );
};

export default HomepageBalanceBreakdownHero;
