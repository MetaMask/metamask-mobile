import React from 'react';
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
import { typography } from '@metamask/design-tokens';
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

/** BodyMd line box, the same height as the loaded "+$0 Today" row. */
const DELTA_SKELETON_HEIGHT = typography.sBodyMD.lineHeight;
/** Fixed so the hero shimmer does not resize as the hidden amount changes. */
const BALANCE_SKELETON_WIDTH = 92;
const BALANCE_SKELETON_HEIGHT = typography.sAmountDisplayLg.lineHeight;

const HomepageBalanceBreakdownHero = ({
  hero,
}: HomepageBalanceBreakdownHeroProps) => {
  const {
    accessibilityHint,
    accessibilityLabel,
    amountText,
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
      <Skeleton
        height={BALANCE_SKELETON_HEIGHT}
        hideChildren={isLoading || hero.isPartiallyLoaded}
        testID={HomepageBalanceBreakdownTestIds.HERO_BALANCE_SKELETON}
        twClassName="rounded-md"
        width={BALANCE_SKELETON_WIDTH}
      >
        {privacyMode ? (
          <SensitiveText
            color={
              hero.hasErroredSlice ? TextColor.TextMuted : TextColor.TextDefault
            }
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
            color={
              hero.hasErroredSlice ? TextColor.TextMuted : TextColor.TextDefault
            }
            isLoading={isLoading}
            loadingValue={zeroBalance}
            testID={WalletViewSelectorsIDs.TOTAL_BALANCE_TEXT}
            value={displayBalance}
            animated={!skipBalanceAnimation}
          />
        )}
      </Skeleton>

      {isLoading ? (
        <Skeleton
          height={DELTA_SKELETON_HEIGHT}
          testID={HomepageBalanceBreakdownTestIds.HERO_DELTA_SKELETON}
          width={120}
        />
      ) : hero.delta && amountText ? (
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
