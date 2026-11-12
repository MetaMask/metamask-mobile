import React, { memo, useCallback } from 'react';
import { Pressable, useWindowDimensions } from 'react-native';
import { typography } from '@metamask/design-tokens';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  ButtonBase,
  ButtonBaseSize,
  FontWeight,
  Icon,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import I18n, { strings } from '../../../../../../locales/i18n';
import { getIntlNumberFormatter } from '../../../../../util/intl';
import { CollectiblesPackCardTestIds } from '../../Collectibles.testIds';
import { getCollectiblesPackArtwork } from '../../constants/packArtwork';
import type { CollectiblesPack } from '../../types';
import { formatUsd } from '../../providers/pack-partner/utils/format';
import { PackTileArtwork } from '../PackArtwork/PackTileArtwork';
import { UsdcIcon } from '../UsdcAmount';
import { formatPackPrice } from './PackCard.utils';
import {
  COMPACT_PACK_ACTION_HEIGHT,
  getCompactPurchaseCopyHeight,
} from './PackCard.layout';

export interface PackCardProps {
  pack: CollectiblesPack;
  onOpen: (pack: CollectiblesPack) => void;
  /** Optional direct purchase action, distinct from selecting the preview. */
  onBuy?: (pack: CollectiblesPack) => void;
  socialContext?: React.ReactNode;
  openedLast7d?: number;
  isDisabled?: boolean;
  /** Smaller editorial tile for home carousels and discovery grids. */
  variant?: 'compact' | 'carousel';
}

/** Pack preview; selecting it opens detail, while Open reviews a purchase. */
const PackCard = ({
  pack,
  onOpen,
  onBuy,
  socialContext,
  openedLast7d,
  isDisabled = false,
  variant = 'compact',
}: PackCardProps) => {
  const tw = useTailwind();
  const { fontScale } = useWindowDimensions();
  const handleOpen = useCallback(() => onOpen(pack), [onOpen, pack]);
  const artwork = getCollectiblesPackArtwork(`pack_partner:${pack.code}`);
  const name = artwork.name ?? pack.name;
  const price = formatPackPrice(pack.price);
  return (
    <Pressable
      onPress={handleOpen}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${strings('collectibles.usdc_amount', { amount: price })}`}
      accessibilityState={{ disabled: isDisabled }}
      testID={CollectiblesPackCardTestIds.CARD(pack.code)}
      style={({ pressed }) =>
        tw.style('w-full', (pressed || isDisabled) && 'opacity-60')
      }
    >
      <Box twClassName="rounded-xl border border-muted overflow-hidden bg-muted">
        <PackTileArtwork
          artwork={artwork}
          name={name}
          padding={variant === 'carousel' ? 3 : 2}
          testID={CollectiblesPackCardTestIds.IMAGE(pack.code)}
        />
        {openedLast7d !== undefined && (
          <Box
            pointerEvents="none"
            twClassName="absolute top-2 left-2 flex-row items-center gap-1 rounded-full bg-default/80 px-2 py-1"
            accessible
            accessibilityLabel={strings('collectibles_discovery.opened_7d', {
              count: openedLast7d,
            })}
            testID={`collectibles-pack-opened-${pack.code}`}
          >
            <Text variant={TextVariant.BodyXs}>
              {getIntlNumberFormatter(I18n.locale).format(openedLast7d)}
            </Text>
          </Box>
        )}
      </Box>
      <Box
        twClassName="pt-2"
        gap={1}
        style={
          onBuy
            ? { minHeight: getCompactPurchaseCopyHeight(fontScale) }
            : undefined
        }
        testID={`collectibles-pack-copy-${pack.code}`}
      >
        {!onBuy && (
          <Text
            variant={TextVariant.BodyXs}
            color={TextColor.TextAlternative}
            numberOfLines={1}
            style={{ minHeight: typography.sBodyXS.lineHeight * fontScale }}
          >
            {pack.category}
          </Text>
        )}
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          numberOfLines={1}
          ellipsizeMode="tail"
          testID={`collectibles-pack-title-${pack.code}`}
          style={{ minHeight: typography.sBodySM.lineHeight * fontScale }}
        >
          {name}
        </Text>
        {socialContext}
        {!onBuy && (
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Between}
            marginTop={1}
          >
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              gap={1}
            >
              <UsdcIcon />
              <Text variant={TextVariant.BodySm} fontWeight={FontWeight.Medium}>
                {price}
              </Text>
            </Box>
            <Icon name={IconName.ArrowRight} size={IconSize.Sm} />
          </Box>
        )}
        {onBuy && (
          <ButtonBase
            size={ButtonBaseSize.Sm}
            isDisabled={isDisabled}
            onPress={(event) => {
              event?.stopPropagation();
              onBuy(pack);
            }}
            twClassName="mt-2 mb-1.5 self-start rounded-full bg-inverse"
            style={{ height: COMPACT_PACK_ACTION_HEIGHT }}
            textClassName={() => 'text-inverse'}
            textProps={{
              variant: TextVariant.BodySm,
              fontWeight: FontWeight.Medium,
            }}
            testID={CollectiblesPackCardTestIds.OPEN_BUTTON(pack.code)}
          >
            {strings('collectibles_discovery.open_for', {
              amount: formatUsd(pack.price),
            })}
          </ButtonBase>
        )}
      </Box>
    </Pressable>
  );
};
export default memo(PackCard);
