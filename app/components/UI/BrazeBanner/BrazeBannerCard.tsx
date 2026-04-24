import React from 'react';
import { Image as RNImage, Pressable } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxAlignItems,
  BoxBackgroundColor,
  BoxFlexDirection,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { BRAZE_BANNER_TEST_IDS } from './BrazeBanner.testIds';

const IMAGE_SIZE = 72;

interface BrazeBannerCardProps {
  title: string | null;
  body: string;
  imageUrl: string | null;
  ctaLabel: string | null;
  onDismiss: () => void;
  height: number;
}

/**
 * Title + body variant. Body uses the muted `text-alternative` colour to give
 * the title visual priority. CTA label is intentionally not rendered here.
 */
const BannerWithTitle = ({
  title,
  body,
  height,
}: {
  title: string;
  body: string;
  height: number;
}) => (
  <Box twClassName="flex-1 self-center relative" style={{ height }}>
    <Text
      testID={BRAZE_BANNER_TEST_IDS.TITLE}
      variant={TextVariant.BodySm}
      fontWeight={FontWeight.Medium}
      color={TextColor.TextDefault}
    >
      {title}
    </Text>
    <Text
      testID={BRAZE_BANNER_TEST_IDS.BODY}
      variant={TextVariant.BodySm}
      color={TextColor.TextAlternative}
    >
      {body}
    </Text>
  </Box>
);

/**
 * Body + optional CTA variant. Used when no title is supplied. CTA renders
 * underneath the body in the primary colour to act as the call-to-action.
 */
const BannerWithCta = ({
  body,
  ctaLabel,
  height,
}: {
  body: string;
  ctaLabel: string | null;
  height: number;
}) => (
  <Box twClassName="flex-1 self-center relative pr-6" style={{ height }}>
    <Text
      testID={BRAZE_BANNER_TEST_IDS.BODY}
      variant={TextVariant.BodySm}
      color={TextColor.TextDefault}
    >
      {body}
    </Text>
    {ctaLabel && (
      <Text
        testID={BRAZE_BANNER_TEST_IDS.CTA}
        variant={TextVariant.BodySm}
        fontWeight={FontWeight.Medium}
        color={TextColor.PrimaryDefault}
      >
        {ctaLabel}
      </Text>
    )}
  </Box>
);

/**
 * Presentational card for a Braze banner campaign.
 *
 * Stateless and side-effect-free — receives only render props and a dismiss
 * callback. The parent (`BrazeBanner`) owns the `Pressable` tap target for
 * deeplink routing and all Braze SDK lifecycle calls.
 *
 * Renders one of two variants based on whether a title is present:
 * - `BannerWithTitle` when `title` is non-null (CTA hidden).
 * - `BannerWithCta` otherwise (CTA shown if `ctaLabel` is set).
 *
 * The image wrapper is omitted entirely when `imageUrl` is absent.
 */
const BrazeBannerCard = ({
  title,
  body,
  imageUrl,
  ctaLabel,
  onDismiss,
  height,
}: BrazeBannerCardProps) => {
  const tw = useTailwind();
  return (
    <Box
      testID={BRAZE_BANNER_TEST_IDS.CONTAINER}
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      backgroundColor={BoxBackgroundColor.BackgroundMuted}
      gap={4}
      twClassName="w-ful h-full flex-row items-center gap-4 rounded-xl px-4 py-3"
      style={{ height }}
    >
      {imageUrl && (
        <Box
          twClassName="overflow-hidden justify-center items-center self-center rounded-xl"
          style={{ width: IMAGE_SIZE, height: IMAGE_SIZE }}
        >
          <RNImage
            testID={BRAZE_BANNER_TEST_IDS.IMAGE}
            source={{ uri: imageUrl }}
            style={{ width: IMAGE_SIZE, height: IMAGE_SIZE }}
            resizeMode="contain"
          />
        </Box>
      )}

      {title ? (
        <BannerWithTitle title={title} body={body} height={IMAGE_SIZE} />
      ) : (
        <BannerWithCta body={body} ctaLabel={ctaLabel} height={IMAGE_SIZE} />
      )}

      <Pressable
        testID={BRAZE_BANNER_TEST_IDS.DISMISS_BUTTON}
        onPress={onDismiss}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={tw.style('absolute top-3 right-4')}
      >
        <Icon
          name={IconName.Close}
          size={IconSize.Md}
          color={IconColor.IconAlternative}
        />
      </Pressable>
    </Box>
  );
};

export default BrazeBannerCard;
