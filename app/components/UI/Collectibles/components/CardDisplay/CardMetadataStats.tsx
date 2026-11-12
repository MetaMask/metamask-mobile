import React from 'react';
import {
  Box,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import type { CollectiblesCard } from '../../types';
import { formatUsd } from '../../providers/pack-partner/utils/format';

/** The three inline facts shared by Replit card details and reveal results. */
export default function CardMetadataStats({
  card,
  value = card.insuredValue,
  valueTestID,
  valuePosition = 'last',
  valueLabel = strings('collectibles.card.insured_value'),
}: {
  card: Pick<CollectiblesCard, 'year' | 'grade' | 'insuredValue'>;
  value?: number;
  valueTestID?: string;
  valueLabel?: string;
  valuePosition?: 'middle' | 'last';
}) {
  const stats = [
    { label: strings('collectibles.card.year'), value: card.year ?? '—' },
    { label: strings('collectibles.card.grade'), value: card.grade ?? '—' },
    {
      label: valueLabel,
      value: value === undefined ? '—' : formatUsd(value),
      testID: value === undefined ? undefined : valueTestID,
    },
  ];
  if (valuePosition === 'middle') [stats[1], stats[2]] = [stats[2], stats[1]];
  return (
    <Box twClassName="w-full flex-row py-4">
      {stats.map((stat, index) => (
        <Box
          key={stat.label}
          gap={1}
          twClassName={`min-w-0 flex-1 items-center px-2 ${index ? 'border-l border-muted' : ''}`}
        >
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Bold}
            numberOfLines={1}
            twClassName="text-center"
            testID={stat.testID}
          >
            {stat.value}
          </Text>
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            twClassName="text-center"
          >
            {stat.label}
          </Text>
        </Box>
      ))}
    </Box>
  );
}
