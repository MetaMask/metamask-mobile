import React, { useCallback } from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Tag,
  TagSeverity,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { GachaPackCardTestIds } from '../../Gacha.testIds';
import type { CollectorCryptPack } from '../../providers/collector-crypt/types';
import CtaButton from '../CtaButton';
import { UsdcIcon } from '../UsdcAmount';
import {
  formatOddsLine,
  formatPackPrice,
  formatWholeNumber,
} from './PackCard.utils';

export interface PackCardProps {
  pack: CollectorCryptPack;
  isAffordable: boolean;
  onOpen: (pack: CollectorCryptPack) => void;
}

/** One pack: category, buyback, name, max value, odds and the lime "Open" CTA. */
const PackCard = ({ pack, isAffordable, onOpen }: PackCardProps) => {
  const handleOpen = useCallback(() => onOpen(pack), [onOpen, pack]);
  const oddsLine = formatOddsLine(pack.odds);

  return (
    <Box
      gap={3}
      twClassName="rounded-2xl bg-section p-4"
      testID={GachaPackCardTestIds.CARD(pack.code)}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
        gap={2}
      >
        {pack.category ? (
          <Tag severity={TagSeverity.Neutral}>{pack.category}</Tag>
        ) : (
          <Box />
        )}
        {pack.instantBuybackPercent > 0 && (
          <Text variant={TextVariant.BodyXs} color={TextColor.TextAlternative}>
            {strings('gacha.packs.instant_buyback', {
              percent: pack.instantBuybackPercent,
            })}
          </Text>
        )}
      </Box>
      <Box gap={1}>
        <Text variant={TextVariant.HeadingSm} numberOfLines={2}>
          {pack.name}
        </Text>
        {pack.maxValue > 0 && (
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {strings('gacha.packs.up_to', {
              value: formatWholeNumber(pack.maxValue),
            })}
          </Text>
        )}
      </Box>
      {oddsLine ? (
        <Text variant={TextVariant.BodyXs} color={TextColor.TextAlternative}>
          {oddsLine}
        </Text>
      ) : null}
      <Box gap={2}>
        <CtaButton
          label={strings('gacha.packs.open_price', {
            price: formatPackPrice(pack.price),
          })}
          endAccessory={<UsdcIcon />}
          isDisabled={!isAffordable}
          onPress={handleOpen}
          testID={GachaPackCardTestIds.OPEN_BUTTON(pack.code)}
        />
        {!isAffordable && (
          <Text
            variant={TextVariant.BodyXs}
            color={TextColor.TextAlternative}
            twClassName="text-center"
            testID={GachaPackCardTestIds.INSUFFICIENT(pack.code)}
          >
            {strings('gacha.packs.insufficient_usdc')}
          </Text>
        )}
      </Box>
    </Box>
  );
};

export default PackCard;
