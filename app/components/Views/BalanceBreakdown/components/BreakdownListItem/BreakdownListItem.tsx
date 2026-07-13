import React from 'react';
import { Pressable, type ImageSourcePropType } from 'react-native';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
  FontWeight,
} from '@metamask/design-system-react-native';
import AvatarToken from '../../../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import { AvatarSize } from '../../../../../component-library/components/Avatars/Avatar/Avatar.types';
import { getPrivacyMaskText } from '../../utils/privacyMask';
import {
  breakdownListItemStyles,
  breakdownListItemProgressFillStyle,
} from './BreakdownListItem.styles';

export type BreakdownListItemTone = 'positive' | 'negative' | 'neutral';

export interface BreakdownListItemProps {
  testID?: string;
  /** Fill color for the row progress bar (slice color in drilldowns). */
  progressBarColor: string;
  title: string;
  subtitle?: string;
  /** When true, subtitle hides under privacy mode (token amounts). */
  sensitiveSubtitle?: boolean;
  /** Small token avatar after the title (e.g. balance breakdown tokens). */
  titleAvatar?: {
    name: string;
    imageUri?: string;
    localImage?: ImageSourcePropType;
  };
  primaryValue: string;
  /** e.g. "-$5.40 (1.85%)" */
  secondaryLine?: string;
  secondaryTone?: BreakdownListItemTone;
  /** 0–1 portion of row width for the accent progress bar */
  progress?: number;
  onPress?: () => void;
  privacyMode?: boolean;
}

function secondaryToneToColor(
  tone: BreakdownListItemTone,
): (typeof TextColor)[keyof typeof TextColor] {
  if (tone === 'positive') {
    return TextColor.SuccessDefault;
  }
  if (tone === 'negative') {
    return TextColor.ErrorDefault;
  }
  return TextColor.TextAlternative;
}

/**
 * Shared row layout for balance breakdown drilldowns (Predict categories, Perps buckets, etc.).
 */
const BreakdownListItem: React.FC<BreakdownListItemProps> = ({
  testID,
  progressBarColor,
  title,
  subtitle,
  sensitiveSubtitle = false,
  titleAvatar,
  primaryValue,
  secondaryLine,
  secondaryTone = 'neutral',
  progress,
  onPress,
  privacyMode = false,
}) => {
  const progressWidth =
    progress !== undefined
      ? `${Math.round(Math.min(1, Math.max(0, progress)) * 100)}%`
      : undefined;

  const subtitleContent =
    subtitle && sensitiveSubtitle && privacyMode
      ? getPrivacyMaskText('medium')
      : subtitle;

  const primaryDisplay =
    privacyMode ? getPrivacyMaskText('medium') : primaryValue;

  const secondaryDisplay =
    secondaryLine && privacyMode
      ? getPrivacyMaskText('short')
      : secondaryLine;

  const content = (
    <Box gap={1} testID={testID}>
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Start}
        justifyContent={BoxJustifyContent.Between}
        gap={3}
      >
        <Box twClassName="flex-1 min-w-0" gap={1}>
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            gap={1}
            twClassName="min-w-0"
          >
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Medium}
              numberOfLines={1}
              twClassName="shrink min-w-0"
            >
              {title}
            </Text>
            {titleAvatar ? (
              <Box twClassName="shrink-0">
                <AvatarToken
                  size={AvatarSize.Xs}
                  name={titleAvatar.name}
                  imageSource={
                    titleAvatar.localImage ??
                    (titleAvatar.imageUri
                      ? { uri: titleAvatar.imageUri }
                      : undefined)
                  }
                  isIpfsGatewayCheckBypassed={false}
                />
              </Box>
            ) : null}
          </Box>
          {subtitle ? (
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              {subtitleContent}
            </Text>
          ) : null}
        </Box>
        <Box twClassName="items-end shrink-0" gap={1}>
          <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
            {primaryDisplay}
          </Text>
          {secondaryLine ? (
            <Text
              variant={TextVariant.BodySm}
              color={secondaryToneToColor(secondaryTone)}
            >
              {secondaryDisplay}
            </Text>
          ) : null}
        </Box>
      </Box>
      {progressWidth !== undefined ? (
        <Box
          twClassName="bg-muted"
          style={breakdownListItemStyles.progressTrack}
        >
          <Box
            style={breakdownListItemProgressFillStyle(
              progressWidth,
              progressBarColor,
            )}
          />
        </Box>
      ) : null}
    </Box>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} accessibilityRole="button">
        {content}
      </Pressable>
    );
  }

  return content;
};

export default BreakdownListItem;
