import React from 'react';
import {
  FontWeight,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import type { PackPartnerRarity } from '../providers/pack-partner/types/packPartner';
import { rarityDotClassNames } from '../utils/rarity';
import { View } from '../../primitives/View';

interface Props {
  rarity: PackPartnerRarity;
  label: string;
  value: string;
}

export function RarityRow({ rarity, label, value }: Props) {
  return (
    <View className="min-h-10 flex-row items-center justify-between gap-2 px-2 py-1">
      <View className="flex-1 flex-row items-center gap-2">
        <View
          className={`size-2 rounded-full ${rarityDotClassNames[rarity]}`}
        />
        <Text variant={TextVariant.BodyMd} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Bold}>
        {value}
      </Text>
    </View>
  );
}
