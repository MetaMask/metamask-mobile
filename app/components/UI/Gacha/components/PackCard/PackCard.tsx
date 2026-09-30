import React, { memo, useCallback } from 'react';
import { useWindowDimensions } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  ButtonSize,
  FontWeight,
  ImageOrSvg,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { GachaPackCardTestIds } from '../../Gacha.testIds';
import { getCollectorCryptPackArtwork, type PackArtwork } from '../../assets/packs';
import type { CollectorCryptPack } from '../../providers/collector-crypt/types';
import CtaButton from '../CtaButton';
import { UsdcIcon } from '../UsdcAmount';
import { formatPackPrice } from './PackCard.utils';

export interface PackCardProps {
  pack: CollectorCryptPack;
  isAffordable: boolean;
  onOpen: (pack: CollectorCryptPack) => void;
  artwork?: PackArtwork;
}

/** Intrinsic height and reserved text slots keep recycled grid cells equal-sized. */
const PackCard = ({ pack, isAffordable, onOpen, artwork: customArtwork }: PackCardProps) => {
  const { fontScale } = useWindowDimensions();
  const handleOpen = useCallback(() => onOpen(pack), [onOpen, pack]);
  const artwork = customArtwork ?? getCollectorCryptPackArtwork(pack.code);
  const displayName = artwork.name ?? pack.name;
  const price = formatPackPrice(pack.price);

  return (
    <Box
      gap={3}
      padding={3}
      twClassName="rounded-2xl border border-muted bg-muted overflow-hidden"
      testID={GachaPackCardTestIds.CARD(pack.code)}
    >
      <ImageOrSvg
        src={artwork.thumbnail}
        width="100%"
        height={208}
        imageProps={{
          contentFit: 'contain',
          cachePolicy: 'memory-disk',
          recyclingKey: pack.code,
          accessibilityLabel: displayName,
          testID: GachaPackCardTestIds.IMAGE(pack.code),
        }}
      />
      <Box gap={1}>
        <Box style={{ height: 48 * fontScale }} twClassName="justify-end">
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            numberOfLines={2}
          >
            {displayName}
          </Text>
        </Box>
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          gap={1}
          style={{ height: 24 * fontScale }}
          accessible
          accessibilityLabel={strings('gacha.usdc_amount', { amount: price })}
        >
          <UsdcIcon />
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            numberOfLines={1}
            adjustsFontSizeToFit
            twClassName="shrink"
          >
            {price}
          </Text>
        </Box>
      </Box>
      <CtaButton
        size={ButtonSize.Md}
        label={strings('gacha.packs.open')}
        isDisabled={!isAffordable}
        onPress={handleOpen}
        testID={GachaPackCardTestIds.OPEN_BUTTON(pack.code)}
      />
    </Box>
  );
};

export default memo(PackCard);
