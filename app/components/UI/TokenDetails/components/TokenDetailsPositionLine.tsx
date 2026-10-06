import React, { useState } from 'react';
import { Pressable } from 'react-native';
import {
  Box,
  BoxFlexDirection,
  BoxJustifyContent,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import {
  computeUnrealizedPnl,
  convertUsdToFiat,
  formatFiat,
  useTraderPosition,
  useUnrealizedPnl,
  useUsdToFiatRate,
  type TraderPosition,
} from '../../SocialFeed/TraderPositionPnl';
import {
  EM_DASH,
  formatHoldDuration,
  formatPercent,
} from '../../SocialFeed/utils/formatters';
import { tradeTimestampToMs } from '../../SocialFeed/utils/tradeTimestamp';

export const TOKEN_DETAILS_POSITION_LINE_TEST_ID =
  'token-details-position-line';

interface TokenDetailsPositionLineProps {
  /** Unresolved until Social confirms how a wallet + token maps to an id. */
  positionId?: string;
  /** Wallet token value in USD. Shown even when the endpoint has no position. */
  balanceFiatUsd?: number;
}

const holdTimeMs = (position: TraderPosition, nowMs: number): number | null => {
  const starts = position.trades
    .map((trade) => tradeTimestampToMs(trade.timestamp))
    .filter((timestamp) => timestamp > 0);
  if (starts.length === 0) {
    return null;
  }
  const start = Math.min(...starts);
  const end = position.isOpen
    ? nowMs
    : tradeTimestampToMs(position.lastTradeAt);
  const duration = end - start;
  return duration > 0 ? duration : null;
};

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    justifyContent={BoxJustifyContent.Between}
    twClassName="py-1"
  >
    <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
      {label}
    </Text>
    <Text variant={TextVariant.BodySm} color={TextColor.TextDefault}>
      {value}
    </Text>
  </Box>
);

/**
 * Position line above the sticky footer buttons.
 * Value always. PnL only when the endpoint has a spot position.
 */
const TokenDetailsPositionLine: React.FC<TokenDetailsPositionLineProps> = ({
  positionId,
  balanceFiatUsd,
}) => {
  const [expanded, setExpanded] = useState(false);
  const pnl = useUnrealizedPnl(positionId);
  const { position } = useTraderPosition(positionId);
  const { currency, rate } = useUsdToFiatRate();

  const value =
    balanceFiatUsd == null
      ? null
      : convertUsdToFiat(balanceFiatUsd, currency, rate);
  const valueLabel =
    value == null
      ? EM_DASH
      : formatFiat(value.amount, value.currency).replace(/^\+/, '');

  const unrealized = position == null ? null : computeUnrealizedPnl(position);
  const totalUsd =
    position == null || unrealized?.usd == null
      ? null
      : position.realizedPnl + unrealized.usd;
  const total =
    totalUsd == null ? null : convertUsdToFiat(totalUsd, currency, rate);
  const totalPercent =
    totalUsd == null || position == null || position.boughtUsd <= 0
      ? null
      : (totalUsd / position.boughtUsd) * 100;

  const showPnl = pnl.hasPosition && total != null;
  const pnlColor =
    (totalUsd ?? 0) > 0 ? TextColor.SuccessDefault : TextColor.ErrorDefault;

  const averageCostUsd =
    position != null && position.positionAmount > 0
      ? position.costBasis / position.positionAmount
      : null;
  const averageCost =
    averageCostUsd == null
      ? null
      : convertUsdToFiat(averageCostUsd, currency, rate);
  const realized =
    position == null
      ? null
      : convertUsdToFiat(position.realizedPnl, currency, rate);
  const held = position == null ? null : holdTimeMs(position, Date.now());

  return (
    <Box twClassName="mb-3">
      <Pressable
        testID={TOKEN_DETAILS_POSITION_LINE_TEST_ID}
        accessibilityRole="button"
        onPress={() => {
          if (showPnl) {
            setExpanded((open) => !open);
          }
        }}
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          justifyContent={BoxJustifyContent.Between}
        >
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {strings('asset_overview.position_pnl.value')}
          </Text>
          <Text variant={TextVariant.BodyMd} color={TextColor.TextDefault}>
            {valueLabel}
          </Text>
        </Box>
        {showPnl && total != null && (
          <Text variant={TextVariant.BodySm} color={pnlColor}>
            {`${strings('asset_overview.position_pnl.pnl')} ${formatFiat(total.amount, total.currency)}${
              totalPercent == null ? '' : ` (${formatPercent(totalPercent)})`
            }`}
          </Text>
        )}
        {pnl.isLoading && (
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {strings('asset_overview.position_pnl.loading')}
          </Text>
        )}
        {pnl.error != null && (
          <Text variant={TextVariant.BodySm} color={TextColor.ErrorDefault}>
            {pnl.error}
          </Text>
        )}
        {(value?.fellBackToUsd || pnl.fellBackToUsd) && (
          <Text variant={TextVariant.BodyXs} color={TextColor.TextAlternative}>
            {strings('asset_overview.position_pnl.shown_in_usd')}
          </Text>
        )}
      </Pressable>
      {expanded && showPnl && position != null && (
        <Box twClassName="mt-2">
          <DetailRow
            label={strings('asset_overview.position_pnl.average_cost')}
            value={
              averageCost == null
                ? EM_DASH
                : formatFiat(averageCost.amount, averageCost.currency).replace(
                    /^\+/,
                    '',
                  )
            }
          />
          <DetailRow
            label={strings('asset_overview.position_pnl.realized')}
            value={
              realized == null
                ? EM_DASH
                : formatFiat(realized.amount, realized.currency)
            }
          />
          <DetailRow
            label={strings('asset_overview.position_pnl.unrealized')}
            value={pnl.valueFormatted ?? EM_DASH}
          />
          <DetailRow
            label={strings('asset_overview.position_pnl.hold_time')}
            value={held == null ? EM_DASH : formatHoldDuration(held)}
          />
        </Box>
      )}
    </Box>
  );
};

export default TokenDetailsPositionLine;
