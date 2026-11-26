import React from 'react';
import {
  FontWeight,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import { useFormatters } from '../../../hooks/useFormatters';
import { collectiblesTestIds } from '../Collectibles.testIds';
import { CapsuleGlass } from '../../primitives/CapsuleGlass';
import { View } from '../../primitives/View';

interface Props {
  code: string;
  value: number;
}

export function EpicOddsGauge({ code, value }: Props) {
  const { formatNumber } = useFormatters();
  const label = value > 0 ? `+${formatNumber(value)}` : formatNumber(value);

  return (
    <View
      accessible
      accessibilityLabel={strings('collectibles.epic_vs_odds.gauge_label', {
        value: label,
      })}
      testID={collectiblesTestIds.epicOddsGauge(code)}
    >
      <CapsuleGlass className="h-6 px-2">
        <Text variant={TextVariant.BodyXs} fontWeight={FontWeight.Medium}>
          {label}
        </Text>
      </CapsuleGlass>
    </View>
  );
}
