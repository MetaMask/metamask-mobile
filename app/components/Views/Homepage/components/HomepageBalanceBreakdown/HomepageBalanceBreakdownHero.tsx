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
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import { Skeleton } from '../../../../../component-library/components-temp/Skeleton';
import BalanceEmptyState from '../../../../UI/BalanceEmptyState';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { WalletViewSelectorsIDs } from '../../../Wallet/WalletView.testIds';
import type { HeroData } from '../../BalanceBreakdown/types';
import { HomepageBalanceBreakdownTestIds } from './HomepageBalanceBreakdown.testIds';
import { useHomepageBalanceBreakdownHero } from './useHomepageBalanceBreakdownHero';
import { oswaldHomeBalanceStyle } from '../../../../../styles/oswaldDisplay';
import { OswaldText } from '../../../../../styles/OswaldText';

interface HomepageBalanceBreakdownHeroProps {
  hero: HeroData;
}

const HomepageBalanceBreakdownHero = ({
  hero,
}: HomepageBalanceBreakdownHeroProps) => {
  const tw = useTailwind();
  const {
    accessibilityHint,
    accessibilityLabel,
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
      accessibilityHint={accessibilityHint}
      accessibilityLabel={accessibilityLabel}
      contentWrapperProps={{
        testID: HomepageBalanceBreakdownTestIds.HERO_CONTENT,
        twClassName: 'w-full flex-col items-start gap-1',
      }}
      onPress={togglePrivacy}
      testID={HomepageBalanceBreakdownTestIds.HERO}
      twClassName="mx-4 h-auto self-stretch flex-col items-start justify-start overflow-visible rounded-none bg-transparent p-0"
    >
      <Skeleton hideChildren={isLoading}>
        <Animated.View style={animatedBalanceStyle}>
          <OswaldText
            style={[
              tw.style(
                hero.isPartiallyLoaded || hero.hasErroredSlice
                  ? 'text-muted'
                  : 'text-default',
              ),
              oswaldHomeBalanceStyle,
            ]}
            testID={WalletViewSelectorsIDs.TOTAL_BALANCE_TEXT}
          >
            {privacyMode ? '••••••••' : displayBalance}
          </OswaldText>
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
