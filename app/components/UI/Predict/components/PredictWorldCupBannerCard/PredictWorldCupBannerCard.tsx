import React from 'react';
import { Image, ImageSourcePropType, Pressable, View } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  ButtonIcon,
  ButtonIconSize,
  ButtonIconVariant,
  FontWeight,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

export const PREDICT_WORLD_CUP_BANNER_CARD_COMPACT_IMAGE_SIZE = 80;

export type PredictWorldCupBannerCardVariant = 'default' | 'compact';

export interface PredictWorldCupBannerCardTestIDs {
  container: string;
  image: string;
  arrow?: string;
}

interface PredictWorldCupBannerCardProps {
  imageSource: ImageSourcePropType;
  title: string;
  description: string;
  onPress: () => void;
  testIDs: PredictWorldCupBannerCardTestIDs;
  /**
   * `compact` renders a fixed 80x80 image on the leading edge; `default`
   * renders a full-width image on top sized via `imageHeight`.
   */
  variant?: PredictWorldCupBannerCardVariant;
  /** Image height for the `default` variant (ignored when `compact`). */
  imageHeight?: number;
  accessibilityLabel?: string;
  /** Tailwind classes for the outer Pressable (margins/spacing). */
  containerClassName?: string;
}

/**
 * Shared presentational card for World Cup promotional banners. Renders a
 * pressable card with an image, a title/description block, and a decorative
 * trailing arrow. The arrow is hidden from the accessibility tree so the whole
 * card is announced as a single button via `accessibilityLabel`.
 *
 * Stateless by design: visibility gating, analytics, and navigation/deeplink
 * behavior live in the consuming banner components.
 */
const PredictWorldCupBannerCard: React.FC<PredictWorldCupBannerCardProps> = ({
  imageSource,
  title,
  description,
  onPress,
  testIDs,
  variant = 'compact',
  imageHeight,
  accessibilityLabel,
  containerClassName = 'mx-4 pb-3',
}) => {
  const tw = useTailwind();
  const isCompact = variant === 'compact';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={tw.style(containerClassName)}
      testID={testIDs.container}
    >
      <View
        style={tw.style(
          'bg-muted rounded-xl overflow-hidden',
          isCompact && 'flex-row items-center',
        )}
      >
        <Image
          source={imageSource}
          resizeMode="cover"
          testID={testIDs.image}
          style={tw.style(
            isCompact ? 'rounded-l-xl' : 'w-full rounded-t-xl',
            isCompact
              ? {
                  height: PREDICT_WORLD_CUP_BANNER_CARD_COMPACT_IMAGE_SIZE,
                  width: PREDICT_WORLD_CUP_BANNER_CARD_COMPACT_IMAGE_SIZE,
                }
              : { height: imageHeight },
          )}
        />
        <View
          style={tw.style(
            'flex-row items-center justify-between p-3',
            isCompact && 'flex-1',
          )}
        >
          <View style={tw.style('flex-shrink')}>
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextDefault}
              fontWeight={FontWeight.Medium}
            >
              {title}
            </Text>
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              {description}
            </Text>
          </View>
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            <ButtonIcon
              onPress={onPress}
              iconName={IconName.ArrowRight}
              iconProps={{ size: IconSize.Md }}
              size={ButtonIconSize.Md}
              variant={ButtonIconVariant.Filled}
              testID={testIDs.arrow}
            />
          </View>
        </View>
      </View>
    </Pressable>
  );
};

export default PredictWorldCupBannerCard;
