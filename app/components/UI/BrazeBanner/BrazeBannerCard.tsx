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
import { BANNER_HEIGHT, BANNER_IMAGE_SIZE } from './BrazeBanner.constants';
import GlassSurface from '../../../component-library/components-temp/GlassSurface';

interface BrazeBannerCardProps {
  title: string | null;
  body: string;
  imageUrl: string | null;
  ctaLabel: string | null;
  onDismiss: () => void;
  isGlass?: boolean;
}

/** Shared dismiss control; callers only customize its placement. */
const BannerDismissButton = ({
  onDismiss,
  twClassName,
}: {
  onDismiss: () => void;
  twClassName?: string;
}) => {
  const tw = useTailwind();
  return (
    <Pressable
      testID={BRAZE_BANNER_TEST_IDS.DISMISS_BUTTON}
      onPress={onDismiss}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      style={tw.style(twClassName)}
    >
      <Icon
        name={IconName.Close}
        size={IconSize.Md}
        color={IconColor.IconAlternative}
      />
    </Pressable>
  );
};

/**
 * Title + body variant. Body uses the muted `text-alternative` colour to give
 * the title visual priority. CTA label is intentionally not rendered here.
 */
const BannerWithTitle = ({
  title,
  body,
  onDismiss,
}: {
  title: string;
  body: string;
  onDismiss: () => void;
}) => (
  <Box twClassName="flex-1">
    <Box flexDirection={BoxFlexDirection.Row} alignItems={BoxAlignItems.Center}>
      <Text
        testID={BRAZE_BANNER_TEST_IDS.TITLE}
        variant={TextVariant.BodySm}
        fontWeight={FontWeight.Medium}
        color={TextColor.TextDefault}
        twClassName="flex-1"
      >
        {title}
      </Text>
      <BannerDismissButton onDismiss={onDismiss} />
    </Box>
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
  onDismiss,
}: {
  body: string;
  ctaLabel: string | null;
  onDismiss: () => void;
}) => (
  <>
    <Box twClassName="flex-1 pr-6">
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
    <BannerDismissButton
      onDismiss={onDismiss}
      twClassName="absolute top-3 right-3"
    />
  </>
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
  isGlass = false,
}: BrazeBannerCardProps) => {
  const tw = useTailwind();
  const content = (
    <>
      {imageUrl && (
        <Box
          twClassName="overflow-hidden rounded-xl"
          style={{ width: BANNER_IMAGE_SIZE, height: BANNER_IMAGE_SIZE }}
        >
          <RNImage
            testID={BRAZE_BANNER_TEST_IDS.IMAGE}
            source={{ uri: imageUrl }}
            style={tw.style('flex-1')}
            resizeMode="contain"
          />
        </Box>
      )}

      {title ? (
        <BannerWithTitle title={title} body={body} onDismiss={onDismiss} />
      ) : (
        <BannerWithCta body={body} ctaLabel={ctaLabel} onDismiss={onDismiss} />
      )}
    </>
  );

  if (isGlass) {
    return (
      <GlassSurface
        testID={BRAZE_BANNER_TEST_IDS.CARD}
        radiusClassName="rounded-xl"
        isInteractive
        hasSheen
        style={[
          tw.style('w-full flex-row items-center gap-4 pl-4 pr-3 py-3'),
          { minHeight: BANNER_HEIGHT },
        ]}
      >
        {content}
      </GlassSurface>
    );
  }

  return (
    <Box
      testID={BRAZE_BANNER_TEST_IDS.CARD}
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      backgroundColor={BoxBackgroundColor.BackgroundMuted}
      gap={4}
      twClassName="w-full rounded-xl pl-4 pr-3 py-3"
      style={{ minHeight: BANNER_HEIGHT }}
    >
      {content}
    </Box>
  );
};

export default BrazeBannerCard;
