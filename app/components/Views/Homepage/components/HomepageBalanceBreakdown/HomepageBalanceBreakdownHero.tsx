import React from 'react';
import Animated from 'react-native-reanimated';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  ButtonBase,
  FontFamily,
  FontWeight,
  SensitiveText,
  SensitiveTextLength,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { AnimatedBalanceText } from '../../../../../component-library/components-temp/AnimatedNumericText';
import { Skeleton } from '../../../../../component-library/components-temp/Skeleton';
import BalanceEmptyState from '../../../../UI/BalanceEmptyState';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { WalletViewSelectorsIDs } from '../../../Wallet/WalletView.testIds';
import type { HeroData } from '../../BalanceBreakdown/types';
import { HomepageBalanceBreakdownTestIds } from './HomepageBalanceBreakdown.testIds';
import { useHomepageBalanceBreakdownHero } from './useHomepageBalanceBreakdownHero';

interface HomepageBalanceBreakdownHeroProps {
  hero: HeroData;
}

/**
 * Keeps the aggregate muted only while another balance slice is unresolved.
 * Settled slice errors are incomplete data, but no longer a loading state.
 *
 * @param isPartiallyLoaded - Whether an eligible slice is still loading.
 * @returns The semantic color for the aggregate balance.
 */
export const getHomepageBalanceColor = (
  isPartiallyLoaded: boolean | undefined,
): TextColor =>
  isPartiallyLoaded ? TextColor.TextMuted : TextColor.TextDefault;

const HomepageBalanceBreakdownHero = ({
  hero,
}: HomepageBalanceBreakdownHeroProps) => {
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
    skipBalanceAnimation,
    shouldShowEmptyState,
    togglePrivacy,
    zeroBalance,
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
      <Animated.View style={animatedBalanceStyle}>
        {privacyMode ? (
          <SensitiveText
            color={getHomepageBalanceColor(hero.isPartiallyLoaded)}
            isHidden={privacyMode}
            length={SensitiveTextLength.Long}
            testID={WalletViewSelectorsIDs.TOTAL_BALANCE_TEXT}
            fontFamily={FontFamily.Hero}
            variant={TextVariant.AmountDisplayLg}
          >
            {displayBalance}
          </SensitiveText>
        ) : (
          <AnimatedBalanceText
            accessible={false}
            color={getHomepageBalanceColor(hero.isPartiallyLoaded)}
            isLoading={isLoading}
            loadingValue={zeroBalance}
            testID={WalletViewSelectorsIDs.TOTAL_BALANCE_TEXT}
            value={displayBalance}
            animated={!skipBalanceAnimation}
          />
        )}
      </Animated.View>

      {!isLoading && hero.delta && amountText ? (
        <Skeleton>
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
