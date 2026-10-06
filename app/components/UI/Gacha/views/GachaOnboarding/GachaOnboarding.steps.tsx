import React from 'react';
import LinearGradient from 'react-native-linear-gradient';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  ImageOrSvg,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import { useTheme } from '../../../../../util/theme';
import { getGachaPackArtwork } from '../../controllers/GachaPackCatalog';
import { GachaOnboardingSelectorsIDs } from './GachaOnboarding.testIds';

const EXAMPLE_ODDS = [
  [
    ['common', '70%'],
    ['uncommon', '20%'],
  ],
  [
    ['rare', '8%'],
    ['epic', '2%'],
  ],
] as const;

/** Introduction with illustrative odds, distinct from the terms of any live pack. */
export const CollectStep = () => {
  const tw = useTailwind();
  const { colors } = useTheme();
  const artwork = getGachaPackArtwork('collector-crypt', 'pokemon_2500');

  return (
    <Box gap={4}>
      <Box
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
        twClassName="h-40 rounded-3xl border border-success-default/30 overflow-hidden"
      >
        <LinearGradient
          colors={[
            colors.success.muted,
            colors.background.alternative,
            colors.info.muted,
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={tw.style('absolute inset-0')}
        />
        <Box twClassName="absolute top-4 left-4 bg-muted rounded-full border border-muted px-2.5 py-1">
          <Text variant={TextVariant.BodySm} fontWeight={FontWeight.Medium}>
            {strings('gacha.onboarding.graded')}
          </Text>
        </Box>
        <ImageOrSvg
          src={artwork.image}
          width={72}
          height={144}
          style={tw.style('-rotate-3')}
          imageProps={{
            contentFit: 'contain',
            accessibilityLabel: artwork.name,
            testID: GachaOnboardingSelectorsIDs.PACK,
          }}
        />
        <Box twClassName="absolute bottom-4 right-4 bg-success-muted rounded-full border border-success-default/40 px-2.5 py-1">
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.SuccessDefault}
            fontWeight={FontWeight.Medium}
          >
            {strings('gacha.onboarding.clear_odds')}
          </Text>
        </Box>
      </Box>
      <Box gap={2}>
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.SuccessDefault}
          fontWeight={FontWeight.Bold}
        >
          {strings('gacha.onboarding.collectibles')}
        </Text>
        <Text variant={TextVariant.HeadingLg} accessibilityRole="header">
          {strings('gacha.onboarding.collect_title')}
        </Text>
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {strings('gacha.onboarding.collect_description')}
        </Text>
      </Box>
      <Box gap={2}>
        <Text variant={TextVariant.HeadingMd}>
          {strings('gacha.onboarding.example_odds')}
        </Text>
        {EXAMPLE_ODDS.map((row, index) => (
          <Box key={index} flexDirection={BoxFlexDirection.Row} gap={2}>
            {row.map(([rarity, odds]) => (
              <Box
                key={rarity}
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                justifyContent={BoxJustifyContent.Between}
                padding={3}
                gap={1}
                twClassName="flex-1 bg-muted rounded-xl"
              >
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.TextAlternative}
                >
                  {strings(`gacha.rarity.${rarity}`)}
                </Text>
                <Text variant={TextVariant.HeadingMd}>{odds}</Text>
              </Box>
            ))}
          </Box>
        ))}
      </Box>
      <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
        {strings('gacha.onboarding.odds_disclaimer')}
      </Text>
    </Box>
  );
};

/** Buyback explanation: the sample rate is explicitly an example, not a quote. */
export const BuybackStep = () => (
  <Box gap={4}>
    <Text variant={TextVariant.HeadingLg} accessibilityRole="header">
      {strings('gacha.onboarding.buyback_title')}
    </Text>
    <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
      {strings('gacha.onboarding.buyback_description')}
    </Text>
    <Box twClassName="rounded-2xl border border-success-default/30 bg-muted overflow-hidden">
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        padding={4}
        gap={3}
      >
        <Box
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Center}
          twClassName="w-10 h-14 rounded-lg border border-success-default/40 bg-default"
        >
          <Icon
            name={IconName.Card}
            size={IconSize.Lg}
            color={IconColor.SuccessDefault}
          />
        </Box>
        <Box gap={1} twClassName="flex-1">
          <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
            {strings('gacha.onboarding.your_card')}
          </Text>
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {strings('gacha.onboarding.example_offer')}
          </Text>
        </Box>
        <Text variant={TextVariant.HeadingMd} color={TextColor.SuccessDefault}>
          85%
        </Text>
      </Box>
      <Box
        flexDirection={BoxFlexDirection.Row}
        twClassName="border-t border-muted"
      >
        <Box padding={4} gap={1} twClassName="flex-1 border-r border-muted">
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {strings('gacha.onboarding.example_window')}
          </Text>
          <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
            {strings('gacha.onboarding.hours')}
          </Text>
        </Box>
        <Box padding={4} gap={1} twClassName="flex-1">
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {strings('gacha.onboarding.funds_go_to')}
          </Text>
          <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
            {strings('gacha.onboarding.your_wallet')}
          </Text>
        </Box>
      </Box>
    </Box>
    <Box gap={2}>
      {(
        [
          ['published_rates', IconName.ShieldLock],
          ['your_choice', IconName.Check],
        ] as const
      ).map(([key, icon]) => (
        <Box
          key={key}
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          gap={3}
          padding={3}
          twClassName="bg-muted border border-muted rounded-2xl"
        >
          <Box padding={3} twClassName="bg-success-muted rounded-xl">
            <Icon
              name={icon}
              color={IconColor.SuccessDefault}
              size={IconSize.Md}
            />
          </Box>
          <Box gap={1} twClassName="flex-1">
            <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
              {strings(`gacha.onboarding.${key}`)}
            </Text>
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              {strings(`gacha.onboarding.${key}_description`)}
            </Text>
          </Box>
        </Box>
      ))}
    </Box>
  </Box>
);
