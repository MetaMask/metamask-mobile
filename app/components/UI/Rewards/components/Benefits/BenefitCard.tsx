import NavigationService from '../../../../../core/NavigationService';
import Routes from '../../../../../constants/navigation/Routes.ts';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { Image, TouchableOpacity } from 'react-native';
import { REWARDS_VIEW_SELECTORS } from '../../Views/RewardsView.constants.ts';
import React from 'react';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { SubscriptionBenefitDto } from '../../../../../core/Engine/controllers/rewards-controller/types.ts';
import {
  formatDateRemaining,
  resolveBenefitEndDate,
} from '../../utils/formatUtils.ts';

/** Narrow enough that the next card peeks in from the right edge. */
export const BENEFIT_PREVIEW_CARD_WIDTH = 210;
export const BENEFIT_PREVIEW_CARD_HEIGHT = 248;

interface Props {
  benefit: SubscriptionBenefitDto;
  /**
   * Dashboard carousel tile. Omit for the full-list row used by BenefitsFullView.
   */
  variant?: 'preview';
}

/**
 * Benefit row for the full list, or a cover-image tile when `variant="preview"`.
 */
const BenefitCard = ({ benefit, variant }: Props) => {
  const tw = useTailwind();
  const isPreview = variant === 'preview';
  const benefitImageTestId = `${REWARDS_VIEW_SELECTORS.TOP_BENEFIT_DETAILS_IMAGE}-${benefit.id}`;

  const remainingTimeEndDate = resolveBenefitEndDate(
    benefit.validTo,
    benefit.actionDate,
  );
  const remainingTime =
    remainingTimeEndDate == null
      ? null
      : formatDateRemaining(remainingTimeEndDate, Date.now());
  const companyName = benefit.companyName?.trim();

  const image = (
    <Image
      source={{ uri: benefit.thumbnail }}
      style={tw.style(isPreview ? 'w-full h-full' : 'w-full h-full rounded-lg')}
      resizeMode="cover"
      testID={benefitImageTestId}
    />
  );

  const copy = (
    <Box twClassName="gap-1">
      <Text
        variant={TextVariant.HeadingSm}
        twClassName="text-default"
        numberOfLines={1}
      >
        {benefit.longTitle}
      </Text>
      <Text
        variant={TextVariant.BodySm}
        color={TextColor.TextAlternative}
        numberOfLines={3}
      >
        {benefit.shortDescription}
      </Text>
    </Box>
  );

  const footer =
    remainingTime != null || companyName ? (
      <Box
        gap={1}
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
        testID={`${REWARDS_VIEW_SELECTORS.BENEFIT_CARD_FOOTER}-${benefit.id}`}
      >
        {remainingTime != null ? (
          <Box
            gap={1}
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="flex-1"
          >
            <Icon
              name={IconName.Clock}
              size={IconSize.Sm}
              color={IconColor.IconAlternative}
            />
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              {remainingTime}
            </Text>
          </Box>
        ) : (
          <Box twClassName="flex-1" />
        )}
        {companyName ? (
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            twClassName="max-w-[40%]"
            numberOfLines={1}
          >
            {companyName}
          </Text>
        ) : null}
      </Box>
    ) : null;

  return (
    <TouchableOpacity
      style={
        isPreview
          ? tw.style('bg-section rounded-xl overflow-hidden', {
              width: BENEFIT_PREVIEW_CARD_WIDTH,
              height: BENEFIT_PREVIEW_CARD_HEIGHT,
            })
          : tw.style('bg-section rounded-lg p-4 h-[154px]')
      }
      onPress={() =>
        NavigationService.navigation.navigate(Routes.REWARD_BENEFIT_FULL_VIEW, {
          benefit,
        })
      }
      activeOpacity={0.7}
    >
      {isPreview ? (
        <>
          <Box twClassName="w-full h-24 bg-muted overflow-hidden">{image}</Box>
          <Box twClassName="flex-1 justify-between gap-2 p-4">
            {copy}
            {footer}
          </Box>
        </>
      ) : (
        <Box gap={4} twClassName="flex-row items-start">
          <Box twClassName="w-[78px] h-[78px] rounded-lg bg-muted overflow-hidden items-center justify-center">
            {image}
          </Box>
          <Box twClassName="flex-1 gap-1">
            {copy}
            {footer}
          </Box>
        </Box>
      )}
    </TouchableOpacity>
  );
};

export default BenefitCard;
