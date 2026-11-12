import React from 'react';
import {
  Box,
  BoxFlexDirection,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import I18n, { strings } from '../../../../../../locales/i18n';
import { getIntlNumberFormatter } from '../../../../../util/intl';
import type { CollectiblesPack } from '../../types';
import { PACK_PARTNER_RARITIES } from '../../providers/pack-partner/constants';
import { formatUsd } from '../../providers/pack-partner/utils/format';

/** Published odds and insured-value bands from the selected live machine. */
const PackOdds = ({ pack }: { pack: CollectiblesPack }) => {
  const percent = getIntlNumberFormatter(I18n.locale, {
    style: 'percent',
    maximumSignificantDigits: 4,
  });
  return (
    <Box gap={4}>
      <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
        {strings('collectibles.pack_detail.published_odds')}
      </Text>
      <Box twClassName="w-full">
        <Box flexDirection={BoxFlexDirection.Row} paddingVertical={3}>
          <Text
            variant={TextVariant.BodyXs}
            color={TextColor.TextAlternative}
            twClassName="w-[27%] pr-2"
          >
            {strings('collectibles.purchase.tier')}
          </Text>
          <Text
            variant={TextVariant.BodyXs}
            color={TextColor.TextAlternative}
            twClassName="w-[15%] pr-2"
          >
            {strings('collectibles.purchase.odds')}
          </Text>
          {pack.tierRanges && (
            <Text
              variant={TextVariant.BodyXs}
              color={TextColor.TextAlternative}
              twClassName="flex-1 pr-2"
            >
              {strings('collectibles.purchase.value_band')}
            </Text>
          )}
          <Text
            variant={TextVariant.BodyXs}
            color={TextColor.TextAlternative}
            twClassName="w-[21%] ml-auto text-right"
          >
            {strings('collectibles.pack_detail.buyback')}
          </Text>
        </Box>
        {PACK_PARTNER_RARITIES.map((rarity) => (
          <Box
            key={rarity}
            flexDirection={BoxFlexDirection.Row}
            paddingVertical={3}
            twClassName="border-t border-muted items-center"
          >
            <Text
              variant={TextVariant.BodyXs}
              fontWeight={FontWeight.Medium}
              twClassName="w-[27%] pr-2"
            >
              {strings(`collectibles.rarity.${rarity}`)}
            </Text>
            <Text variant={TextVariant.BodyXs} twClassName="w-[15%] pr-2">
              {percent.format(pack.odds[rarity])}
            </Text>
            {pack.tierRanges && (
              <Text variant={TextVariant.BodyXs} twClassName="flex-1 pr-2">
                {formatUsd(pack.tierRanges[rarity].start)} –{' '}
                {formatUsd(pack.tierRanges[rarity].end)}
              </Text>
            )}
            <Text
              variant={TextVariant.BodyXs}
              twClassName="w-[21%] ml-auto text-right"
            >
              {percent.format(pack.instantBuybackPercent / 100)}
            </Text>
          </Box>
        ))}
      </Box>
      <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
        {strings('collectibles.purchase.buyback_rate', {
          percent: pack.instantBuybackPercent,
        })}
      </Text>
      {pack.expectedValue != null && (
        <Text variant={TextVariant.BodySm}>
          {strings('collectibles.purchase.expected_value', {
            value: formatUsd(pack.expectedValue),
          })}
        </Text>
      )}
      <Text variant={TextVariant.BodyXs} color={TextColor.TextAlternative}>
        {strings('collectibles.purchase.odds_note')}
      </Text>
    </Box>
  );
};
export default PackOdds;
