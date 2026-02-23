import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import {
  getPerpsDisplaySymbol,
  type Position,
} from '@metamask/perps-controller';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../../component-library/components/Texts/Text';
import PerpsTokenLogo from '../../../../../../UI/Perps/components/PerpsTokenLogo';
import PerpsLeverage from '../../../../../../UI/Perps/components/PerpsLeverage/PerpsLeverage';
import {
  formatPerpsFiat,
  formatPercentage,
  PRICE_RANGES_MINIMAL_VIEW,
} from '../../../../../../UI/Perps/utils/formatUtils';
import { strings } from '../../../../../../../../locales/i18n';
import styles from './PerpsPositionRow.styles';
import type { PerpsPositionRowProps } from './PerpsPositionRow.types';

const ICON_SIZE = 36;

/**
 * Build a human-readable TP/SL label as percentage distance from entry.
 * Returns null when neither TP nor SL is configured.
 */
export function buildTpSlLabel(
  position: Position,
  tpLabel = 'TP',
  slLabel = 'SL',
): string | null {
  const tp = position.takeProfitPrice
    ? parseFloat(position.takeProfitPrice)
    : 0;
  const sl = position.stopLossPrice ? parseFloat(position.stopLossPrice) : 0;
  const entry = parseFloat(position.entryPrice);

  if (!entry || entry <= 0) return null;

  const parts: string[] = [];

  if (tp > 0) {
    const tpPct = Math.abs(((tp - entry) / entry) * 100);
    parts.push(`${tpLabel} ${tpPct.toFixed(0)}%`);
  }

  if (sl > 0) {
    const slPct = Math.abs(((sl - entry) / entry) * 100);
    parts.push(`${slLabel} ${slPct.toFixed(0)}%`);
  }

  return parts.length > 0 ? parts.join(', ') : null;
}

/**
 * PerpsPositionRow — compact row for displaying an open perps position.
 *
 * Shows token logo, direction + symbol, leverage badge, TP/SL info,
 * position value, and ROE percentage.
 */
const PerpsPositionRow: React.FC<PerpsPositionRowProps> = ({
  position,
  onPress,
  testID,
}) => {
  const isLong = parseFloat(position.size) >= 0;
  const direction = isLong
    ? strings('perps.order.long_label')
    : strings('perps.order.short_label');
  const displaySymbol = getPerpsDisplaySymbol(position.symbol);

  const roeRaw = parseFloat(position.returnOnEquity || '0');
  const roePct = isNaN(roeRaw) ? 0 : roeRaw * 100;
  const isPositive = roePct >= 0;

  const leverageLabel = `${position.leverage.value}X ${isLong ? strings('perps.market.long_lowercase') : strings('perps.market.short_lowercase')}`;
  const tpSlLabel = buildTpSlLabel(
    position,
    strings('perps.order.tp'),
    strings('perps.order.sl'),
  );

  const positionValueDisplay = formatPerpsFiat(position.positionValue, {
    ranges: PRICE_RANGES_MINIMAL_VIEW,
  });
  const roeDisplay = formatPercentage(roePct, 1);

  return (
    <TouchableOpacity
      style={[styles.row]}
      activeOpacity={0.7}
      onPress={onPress}
      testID={testID ?? `perps-position-row-${position.symbol}`}
    >
      <PerpsTokenLogo symbol={position.symbol} size={ICON_SIZE} />

      <View style={styles.middle}>
        <View style={styles.nameRow}>
          <Text variant={TextVariant.BodyMDMedium} color={TextColor.Default}>
            {direction} {displaySymbol}
          </Text>
          <PerpsLeverage maxLeverage={leverageLabel} />
        </View>
        <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
          {tpSlLabel ?? strings('homepage.positions.no_tp_sl')}
        </Text>
      </View>

      <View style={styles.right}>
        <Text variant={TextVariant.BodyMDMedium} color={TextColor.Default}>
          {positionValueDisplay}
        </Text>
        <Text
          variant={TextVariant.BodySM}
          color={isPositive ? TextColor.Success : TextColor.Error}
        >
          {roeDisplay}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

export default React.memo(PerpsPositionRow);
