import React, { useState } from 'react';
import {
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import { useFormatters } from '../../../hooks/useFormatters';
import type { PackDetail } from '../types/packs';
import { collectiblesTestIds } from '../Collectibles.testIds';
import { Image } from '../../primitives/Image';
import { View } from '../../primitives/View';
import { ArtworkFallback } from './ArtworkFallback';
import { PackActivityLine } from './PackActivityLine';

interface Props {
  pack: PackDetail;
}

export function PackDetailHeader({ pack }: Props) {
  const { formatCurrency, formatNumber } = useFormatters();

  const [failedImageUrl, setFailedImageUrl] = useState<string>();

  const noValue = strings('collectibles.pack_detail.no_value');
  const formatUsd = (value?: number) =>
    value === undefined ? noValue : formatCurrency(value, 'USD');
  const categoryLine =
    pack.category && pack.tier !== undefined
      ? strings('collectibles.pack_detail.category_tier', {
          category: pack.category,
          tier: formatNumber(pack.tier),
        })
      : pack.category;
  const stats = [
    {
      key: 'buyback',
      label: strings('collectibles.pack_detail.buyback_rate'),
      value:
        pack.buybackRatePercent === undefined
          ? noValue
          : formatNumber(pack.buybackRatePercent / 100, {
              style: 'percent',
              maximumFractionDigits: 2,
            }),
    },
    {
      key: 'average',
      label: strings('collectibles.pack_detail.avg_card_value'),
      value: formatUsd(pack.averageCardValueUsd),
    },
    {
      key: 'top',
      label: strings('collectibles.pack_detail.top_card'),
      value: formatUsd(pack.topCardValueUsd),
    },
  ];

  return (
    <View className="items-center gap-3 px-2">
      {pack.imageUrl && failedImageUrl !== pack.imageUrl ? (
        <Image
          source={{ uri: pack.imageUrl }}
          contentFit="contain"
          className="h-80 w-56 rounded-xl"
          onError={() => setFailedImageUrl(pack.imageUrl)}
          testID={collectiblesTestIds.packDetailArt}
        />
      ) : (
        <ArtworkFallback
          className="h-80 w-56 rounded-xl"
          testID={collectiblesTestIds.packDetailArtFallback}
        />
      )}
      <View className="items-center gap-1">
        {categoryLine ? (
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {categoryLine}
          </Text>
        ) : null}
        <Text variant={TextVariant.HeadingLg} className="text-center">
          {pack.name}
        </Text>
      </View>
      <View className="w-full flex-row">
        {stats.map((stat, index) => (
          <View
            key={stat.key}
            className={`flex-1 items-center gap-1 px-1 py-3 ${index < stats.length - 1 ? 'border-r border-muted' : ''}`}
          >
            <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Bold}>
              {stat.value}
            </Text>
            <Text
              variant={TextVariant.BodyXs}
              color={TextColor.TextAlternative}
              className="text-center"
            >
              {stat.label}
            </Text>
          </View>
        ))}
      </View>
      <PackActivityLine activity={pack.activity} />
    </View>
  );
}
