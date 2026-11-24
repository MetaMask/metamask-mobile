// Third party dependencies
import React from 'react';
import { Image, Pressable } from 'react-native';

// External dependencies
import {
  Box,
  ButtonIcon,
  ButtonIconSize,
  FontWeight,
  IconName,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../locales/i18n';

// Internal dependencies
import type {
  BannerCompactProps,
  BannerCompactThumbnailShape,
} from './BannerCompact.types';
import { BannerCompactSelectorsIDs } from './BannerCompact.testIds';

/** The 72x72 thumbnail slot, from the compact banner spec. */
const THUMBNAIL_SIZE = 72;

/** The row's layout, shared by the pressable and the static render. */
const ROW_CLASSES = 'flex-row items-start gap-4 rounded-xl bg-muted px-4 py-3';

const THUMBNAIL_RADIUS_CLASSES: Record<BannerCompactThumbnailShape, string> = {
  square: 'rounded-xl',
  round: 'rounded-full',
};

/**
 * Tells a thumbnail image source (a `require` number, or a `{ uri }`
 * object) from a custom node, so both can share the `thumbnail` prop.
 */
const isImageSource = (
  value: NonNullable<BannerCompactProps['thumbnail']>,
): boolean =>
  typeof value === 'number' ||
  (typeof value === 'object' &&
    value !== null &&
    !React.isValidElement(value) &&
    !Array.isArray(value) &&
    typeof (value as { uri?: unknown }).uri === 'string');

interface RowContentProps {
  thumbnail: BannerCompactProps['thumbnail'];
  thumbnailShape: BannerCompactThumbnailShape;
  thumbnailTestID: string;
  title: string;
  description: string;
  /** Clears the title's right edge for the overlaid close button. */
  hasCloseButton: boolean;
  actionLabel?: string;
  actionTestID: string;
}

/** The thumbnail slot and the copy column the row renders. */
const RowContent = ({
  thumbnail,
  thumbnailShape,
  thumbnailTestID,
  title,
  description,
  hasCloseButton,
  actionLabel,
  actionTestID,
}: RowContentProps) => (
  <>
    {thumbnail === undefined ? null : (
      <Box
        twClassName={`h-[72px] w-[72px] shrink-0 items-center justify-center overflow-hidden ${THUMBNAIL_RADIUS_CLASSES[thumbnailShape]}`}
        testID={thumbnailTestID}
      >
        {isImageSource(thumbnail) ? (
          <Image
            source={thumbnail}
            style={{ width: THUMBNAIL_SIZE, height: THUMBNAIL_SIZE }}
            resizeMode="contain"
          />
        ) : (
          thumbnail
        )}
      </Box>
    )}
    <Box twClassName="flex-1 gap-0.5">
      {/* pr-8 keeps the title clear of the close button over its row. */}
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Medium}
        twClassName={hasCloseButton ? 'pr-8' : undefined}
        numberOfLines={1}
      >
        {title}
      </Text>
      <Text
        variant={TextVariant.BodySm}
        color={TextColor.TextAlternative}
        numberOfLines={2}
      >
        {description}
      </Text>
      {actionLabel ? (
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          color={TextColor.PrimaryDefault}
          twClassName="mt-1"
          testID={actionTestID}
        >
          {actionLabel}
        </Text>
      ) : null}
    </Box>
  </>
);

/**
 * A compact status banner: a leading 72x72 thumbnail beside a title, a
 * two-line description, and an optional text action. The whole row is one
 * press target when `onPress` is given, and the optional close button is
 * laid over its top-right corner as a sibling rather than nested inside it,
 * because on Android a press on a nested pressable can also press the row.
 *
 * @param props - The banner's content and handlers.
 * @returns The banner.
 */
const BannerCompact = ({
  thumbnail,
  thumbnailShape = 'square',
  title,
  description,
  actionLabel,
  onPress,
  onClose,
  testID,
  ...pressableProps
}: BannerCompactProps) => {
  const tw = useTailwind();
  const rootId = testID ?? BannerCompactSelectorsIDs.CONTAINER;
  const thumbnailId = testID
    ? `${rootId}-thumbnail`
    : BannerCompactSelectorsIDs.THUMBNAIL;
  const closeButtonId = testID
    ? `${rootId}-close`
    : BannerCompactSelectorsIDs.CLOSE_BUTTON;
  const actionId = `${rootId}-action`;

  return (
    <Box>
      {onPress ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={actionLabel ? `${title}, ${actionLabel}` : title}
          onPress={onPress}
          style={({ pressed }) =>
            tw.style(ROW_CLASSES, pressed && 'opacity-80')
          }
          testID={rootId}
          {...pressableProps}
        >
          <RowContent
            thumbnail={thumbnail}
            thumbnailShape={thumbnailShape}
            thumbnailTestID={thumbnailId}
            title={title}
            description={description}
            hasCloseButton={Boolean(onClose)}
            actionLabel={actionLabel}
            actionTestID={actionId}
          />
        </Pressable>
      ) : (
        <Box twClassName={ROW_CLASSES} testID={rootId}>
          <RowContent
            thumbnail={thumbnail}
            thumbnailShape={thumbnailShape}
            thumbnailTestID={thumbnailId}
            title={title}
            description={description}
            hasCloseButton={false}
            actionLabel={actionLabel}
            actionTestID={actionId}
          />
        </Box>
      )}
      {onClose ? (
        <ButtonIcon
          accessibilityLabel={strings('navigation.close')}
          iconName={IconName.Close}
          onPress={onClose}
          size={ButtonIconSize.Sm}
          testID={closeButtonId}
          twClassName="absolute right-4 top-3"
        />
      ) : null}
    </Box>
  );
};

export default BannerCompact;
