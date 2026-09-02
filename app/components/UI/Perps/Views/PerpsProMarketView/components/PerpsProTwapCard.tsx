import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  IconName,
  SensitiveText,
  SensitiveTextLength,
  Tag,
  TagSeverity,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import {
  getPerpsDisplaySymbol,
  PERPS_CONSTANTS,
  type TwapOrder,
} from '@metamask/perps-controller';
import React from 'react';
import { Pressable } from 'react-native';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../../../locales/i18n';
import { selectPrivacyMode } from '../../../../../../selectors/preferencesController';
import PerpsTokenLogo from '../../../components/PerpsTokenLogo';
import { PerpsProMarketViewSelectorsIDs } from '../../../Perps.testIds';
import {
  formatPerpsFiat,
  formatPositionSize,
  formatProOrderCardTimestamp,
  PRICE_RANGES_UNIVERSAL,
} from '../../../utils/formatUtils';
import {
  formatTwapDuration,
  formatTwapProgressPercent,
} from '../../../utils/twapFormat';

interface PerpsProTwapCardProps {
  twapOrder: TwapOrder;
  testID?: string;
  /** Switches the Pro screen to this schedule's market. */
  onPress?: (twapOrder: TwapOrder) => void;
  /** Omitted for terminal schedules, which cannot be terminated. */
  onTerminate?: (twapOrder: TwapOrder) => void;
  isTerminateDisabled?: boolean;
}

interface KeyValueItemProps {
  label: string;
  value: string;
  isHidden?: boolean;
  testID?: string;
}

const KeyValueItem = ({
  label,
  value,
  isHidden = false,
  testID,
}: KeyValueItemProps) => (
  <Box>
    <Text variant={TextVariant.BodyXs} color={TextColor.TextAlternative}>
      {label}
    </Text>
    <SensitiveText
      variant={TextVariant.BodyXs}
      fontWeight={FontWeight.Medium}
      isHidden={isHidden}
      length={SensitiveTextLength.Short}
      testID={testID}
    >
      {value}
    </SensitiveText>
  </Box>
);

const STATUS_LABEL_KEYS: Record<TwapOrder['status'], string> = {
  active: 'perps.pro_positions_panel.twap_card.status_active',
  completed: 'perps.pro_positions_panel.twap_card.status_completed',
  completed_underfilled:
    'perps.pro_positions_panel.twap_card.status_completed_underfilled',
  canceled: 'perps.pro_positions_panel.twap_card.status_canceled',
  failed: 'perps.pro_positions_panel.twap_card.status_failed',
};

const STATUS_SEVERITIES: Record<TwapOrder['status'], TagSeverity> = {
  active: TagSeverity.Info,
  completed: TagSeverity.Success,
  completed_underfilled: TagSeverity.Warning,
  canceled: TagSeverity.Neutral,
  failed: TagSeverity.Danger,
};

const formatOptionalPrice = (price?: string): string => {
  const parsedPrice = Number.parseFloat(price ?? '');
  return Number.isFinite(parsedPrice) && parsedPrice > 0
    ? formatPerpsFiat(parsedPrice, { ranges: PRICE_RANGES_UNIVERSAL })
    : PERPS_CONSTANTS.FallbackPriceDisplay;
};

const MILLISECONDS_PER_MINUTE = 60_000;

/**
 * Summary of one venue-native TWAP schedule in the Pro market view.
 *
 * Renders the fields the controller reports on `TwapOrder`. Trigger price and
 * max price are deliberately absent: `@metamask/perps-controller` does not
 * carry them on this type, so there is nothing truthful to show for them.
 */
const PerpsProTwapCard = ({
  twapOrder,
  testID,
  onPress,
  onTerminate,
  isTerminateDisabled = false,
}: PerpsProTwapCardProps) => {
  const privacyMode = useSelector(selectPrivacyMode);
  const displaySymbol = getPerpsDisplaySymbol(twapOrder.symbol);
  const isBuySide = twapOrder.side === 'buy';
  const directionLabel = isBuySide
    ? strings('perps.market.long')
    : strings('perps.market.short');
  const directionSeverity = isBuySide
    ? TagSeverity.Success
    : TagSeverity.Danger;

  const totalSize = formatPositionSize(twapOrder.size);
  const executedSize = formatPositionSize(twapOrder.executedSize);
  const elapsedMinutes = Math.floor(
    twapOrder.elapsedTimeMilliseconds / MILLISECONDS_PER_MINUTE,
  );

  const handlePress = onPress ? () => onPress(twapOrder) : undefined;

  return (
    // The card owns a Terminate button, so this wrapper stays out of the
    // accessibility tree; the header repeats the handler as the labelled,
    // screen-reader-reachable entry point for the same action.
    <Pressable
      onPress={handlePress}
      disabled={!handlePress}
      accessible={false}
      testID={testID ?? PerpsProMarketViewSelectorsIDs.TWAP_ROW}
    >
      <Box twClassName="gap-3 py-3">
        <Pressable
          onPress={handlePress}
          disabled={!handlePress}
          accessibilityRole={handlePress ? 'button' : undefined}
          accessibilityLabel={
            handlePress
              ? strings('perps.pro_positions_panel.view_market_accessibility', {
                  symbol: displaySymbol,
                })
              : undefined
          }
        >
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Between}
            twClassName="gap-4 px-2 py-2"
          >
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              twClassName="flex-1 gap-4"
            >
              <PerpsTokenLogo symbol={twapOrder.symbol} size={40} />
              <Box>
                <Box
                  flexDirection={BoxFlexDirection.Row}
                  alignItems={BoxAlignItems.Center}
                  twClassName="gap-1"
                >
                  <Text
                    variant={TextVariant.BodyMd}
                    fontWeight={FontWeight.Medium}
                    testID={PerpsProMarketViewSelectorsIDs.TWAP_MARKET}
                  >
                    {displaySymbol}
                  </Text>
                  <Tag
                    testID={PerpsProMarketViewSelectorsIDs.TWAP_DIRECTION_TAG}
                    severity={directionSeverity}
                  >
                    {directionLabel}
                  </Tag>
                  {twapOrder.reduceOnly ? (
                    <Tag
                      testID={
                        PerpsProMarketViewSelectorsIDs.TWAP_REDUCE_ONLY_TAG
                      }
                      severity={TagSeverity.Neutral}
                    >
                      {strings(
                        'perps.pro_positions_panel.twap_card.reduce_only',
                      )}
                    </Tag>
                  ) : null}
                </Box>
                <Text
                  variant={TextVariant.BodySm}
                  fontWeight={FontWeight.Medium}
                  color={TextColor.TextAlternative}
                  testID={PerpsProMarketViewSelectorsIDs.TWAP_CREATED_AT}
                >
                  {formatProOrderCardTimestamp(twapOrder.startedAt)}
                </Text>
              </Box>
            </Box>
            <Tag
              severity={STATUS_SEVERITIES[twapOrder.status]}
              testID={PerpsProMarketViewSelectorsIDs.TWAP_STATUS_TAG}
            >
              {strings(STATUS_LABEL_KEYS[twapOrder.status])}
            </Tag>
          </Box>
        </Pressable>

        <Box twClassName="px-2">
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="gap-4 rounded-xl border border-muted px-4 py-3"
          >
            <Box twClassName="flex-1 min-w-0 gap-3">
              <KeyValueItem
                label={strings(
                  'perps.pro_positions_panel.twap_card.total_size',
                )}
                value={`${totalSize} ${displaySymbol}`}
                isHidden={privacyMode}
                testID={PerpsProMarketViewSelectorsIDs.TWAP_SIZE}
              />
              <KeyValueItem
                label={strings(
                  'perps.pro_positions_panel.twap_card.filled_size',
                )}
                value={`${executedSize} ${displaySymbol}`}
                isHidden={privacyMode}
                testID={PerpsProMarketViewSelectorsIDs.TWAP_FILLED_SIZE}
              />
              <KeyValueItem
                label={strings(
                  'perps.pro_positions_panel.twap_card.average_price',
                )}
                value={formatOptionalPrice(twapOrder.averagePrice)}
                isHidden={privacyMode}
                testID={PerpsProMarketViewSelectorsIDs.TWAP_AVERAGE_PRICE}
              />
            </Box>
            <Box twClassName="flex-1 min-w-0 gap-3">
              <KeyValueItem
                label={strings('perps.pro_positions_panel.twap_card.progress')}
                value={formatTwapProgressPercent(twapOrder.fillProgressBps)}
                testID={PerpsProMarketViewSelectorsIDs.TWAP_PROGRESS}
              />
              <KeyValueItem
                label={strings('perps.pro_positions_panel.twap_card.elapsed')}
                value={`${formatTwapDuration(
                  elapsedMinutes,
                )} / ${formatTwapDuration(twapOrder.durationMinutes)}`}
                testID={PerpsProMarketViewSelectorsIDs.TWAP_ELAPSED}
              />
              <KeyValueItem
                label={strings('perps.pro_positions_panel.twap_card.randomize')}
                value={
                  twapOrder.randomize
                    ? strings('perps.order_details.yes')
                    : strings('perps.order_details.no')
                }
              />
            </Box>
          </Box>
        </Box>

        {onTerminate ? (
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="gap-2 px-2"
          >
            <Button
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Sm}
              isDanger
              textProps={{
                variant: TextVariant.BodySm,
                fontWeight: FontWeight.Medium,
              }}
              startIconName={IconName.Close}
              twClassName="flex-1"
              onPress={() => onTerminate(twapOrder)}
              isDisabled={isTerminateDisabled}
              testID={PerpsProMarketViewSelectorsIDs.TWAP_TERMINATE}
            >
              {strings('perps.pro_positions_panel.twap_card.terminate')}
            </Button>
          </Box>
        ) : null}
      </Box>
    </Pressable>
  );
};

export default React.memo(PerpsProTwapCard);
