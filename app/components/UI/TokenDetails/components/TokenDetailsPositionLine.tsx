import React, { useState } from 'react';
import { Pressable } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import {
  convertUsdToFiat,
  formatFiat,
  useTraderPosition,
  useUnrealizedPnl,
  useUsdToFiatRate,
  type TraderPosition,
} from '../../SocialFeed/TraderPositionPnl';
import { EM_DASH, formatHoldDuration } from '../../SocialFeed/utils/formatters';
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
 * Sticky position block above the footer buttons.
 * "Your position" is always shown. Unrealised PnL is the second row when a
 * spot position exists.
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

  const showPnl = pnl.hasPosition && pnl.valueFormatted != null;
  const pnlColor = pnl.valueFormatted?.startsWith('-')
    ? TextColor.ErrorDefault
    : pnl.isProfit
      ? TextColor.SuccessDefault
      : TextColor.TextDefault;
  const unrealisedLabel =
    pnl.percentFormatted == null
      ? pnl.valueFormatted
      : `${pnl.valueFormatted} (${pnl.percentFormatted})`;

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
    <Box twClassName="mb-3 gap-1">
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
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Between}
        >
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
            {strings('asset_overview.position_pnl.your_position')}
          </Text>
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="gap-1"
          >
            <Text variant={TextVariant.BodyMd} color={TextColor.TextDefault}>
              {valueLabel}
            </Text>
            {showPnl && (
              <Icon
                name={expanded ? IconName.ArrowUp : IconName.ArrowDown}
                size={IconSize.Sm}
                color={IconColor.IconAlternative}
              />
            )}
          </Box>
        </Box>
        {showPnl && unrealisedLabel != null && (
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Between}
            twClassName="mt-1"
          >
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              {strings('asset_overview.position_pnl.unrealised')}
            </Text>
            <Text variant={TextVariant.BodySm} color={pnlColor}>
              {unrealisedLabel}
            </Text>
          </Box>
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
