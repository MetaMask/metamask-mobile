import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Icon,
  IconName,
  IconSize,
  SensitiveText,
  SensitiveTextLength,
  Tag,
  TagSeverity,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import {
  PERPS_CONSTANTS,
  getPerpsDisplaySymbol,
  type Position,
} from '@metamask/perps-controller';
import React from 'react';
import { Pressable } from 'react-native';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../../../locales/i18n';
import { selectPrivacyMode } from '../../../../../../selectors/preferencesController';
import PerpsTokenLogo from '../../../components/PerpsTokenLogo';
import { PerpsProMarketViewSelectorsIDs } from '../../../Perps.testIds';
import {
  formatPercentage,
  formatPerpsFiat,
  formatPerpsPrice,
  formatPnl,
  formatPositionSize,
  PRICE_RANGES_MINIMAL_VIEW,
  PRICE_RANGES_UNIVERSAL,
} from '../../../utils/formatUtils';

interface PerpsProPositionCardProps {
  position: Position;
  /** Test ID for the card container. */
  testID?: string;
  /** Switches the Pro screen to this position's market. */
  onPress?: (position: Position) => void;
  onClose?: (position: Position) => void;
  onReverse?: (position: Position) => void;
  onShare?: (position: Position) => void;
  onEditTpSl?: (position: Position) => void;
  isEditTpSlDisabled?: boolean;
  onEditMargin?: (position: Position) => void;
  isEditMarginDisabled?: boolean;
}

const ACTION_BUTTON_CLASS_NAME = 'flex-1 border-muted bg-background-default';

interface KeyValueItemProps {
  label: string;
  value: string;
  valueColor?: TextColor;
  labelAccessory?: React.ReactNode;
  isHidden?: boolean;
  onValuePress?: () => void;
  isValuePressDisabled?: boolean;
  valuePressTestID?: string;
  valuePressAccessibilityLabel?: string;
  showEditIcon?: boolean;
}

const KeyValueItem = ({
  label,
  value,
  valueColor = TextColor.TextDefault,
  labelAccessory,
  isHidden = false,
  onValuePress,
  isValuePressDisabled = false,
  valuePressTestID,
  valuePressAccessibilityLabel,
  showEditIcon = false,
}: KeyValueItemProps) => {
  const valueContent = (
    <>
      <SensitiveText
        variant={TextVariant.BodyXs}
        fontWeight={FontWeight.Medium}
        color={isHidden ? TextColor.TextDefault : valueColor}
        isHidden={isHidden}
        length={SensitiveTextLength.Short}
      >
        {value}
      </SensitiveText>
      {showEditIcon ? <Icon name={IconName.Edit} size={IconSize.Sm} /> : null}
    </>
  );

  return (
    <Box>
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="gap-1"
      >
        <Text variant={TextVariant.BodyXs} color={TextColor.TextAlternative}>
          {label}
        </Text>
        {labelAccessory}
      </Box>
      {onValuePress ? (
        <Pressable
          onPress={onValuePress}
          disabled={isValuePressDisabled}
          accessibilityRole="button"
          accessibilityLabel={valuePressAccessibilityLabel}
          testID={valuePressTestID}
        >
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="gap-1"
          >
            {valueContent}
          </Box>
        </Pressable>
      ) : (
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="gap-1"
        >
          {valueContent}
        </Box>
      )}
    </Box>
  );
};

/**
 * PerpsProPositionCard
 *
 * Read-only summary of a single open perps position for the Pro market view.
 * Shows asset, direction/leverage, size, unrealized PnL, and key figures
 * (entry, mark, liquidation prices, margin, TP/SL, funding).
 *
 * Action buttons delegate to existing Perps close/reverse/share flows via callbacks.
 */
const PerpsProPositionCard = ({
  position,
  testID,
  onPress,
  onClose,
  onReverse,
  onShare,
  onEditTpSl,
  isEditTpSlDisabled = false,
  onEditMargin,
  isEditMarginDisabled = false,
}: PerpsProPositionCardProps) => {
  const privacyMode = useSelector(selectPrivacyMode);
  const displaySymbol = getPerpsDisplaySymbol(position.symbol);
  const sizeNum = parseFloat(position.size);
  const isLong = sizeNum >= 0;
  const absoluteSize = Math.abs(sizeNum);

  const pnlNum = parseFloat(position.unrealizedPnl);
  const roe = (parseFloat(position.returnOnEquity) || 0) * 100;

  const directionLabel = isLong
    ? strings('perps.market.long')
    : strings('perps.market.short');
  const directionSeverity = isLong ? TagSeverity.Success : TagSeverity.Danger;

  const marginTypeLabel =
    position.leverage.type === 'isolated'
      ? strings('perps.pro_positions_panel.card.isolated')
      : strings('perps.pro_positions_panel.card.cross');
  const canEditMargin =
    position.leverage.type === 'isolated' && Boolean(onEditMargin);

  // Mark price is not stored on the position; derive it from notional.
  // With useLivePnl, enrichPositionsWithLivePnL keeps positionValue in sync
  // with the live mark so this stays consistent with unrealized PnL.
  const markPriceNum =
    absoluteSize > 0 ? parseFloat(position.positionValue) / absoluteSize : NaN;
  const markPriceDisplay = Number.isFinite(markPriceNum)
    ? formatPerpsFiat(markPriceNum, { ranges: PRICE_RANGES_UNIVERSAL })
    : PERPS_CONSTANTS.FallbackPriceDisplay;

  const entryPriceDisplay = formatPerpsFiat(position.entryPrice, {
    ranges: PRICE_RANGES_UNIVERSAL,
  });
  const liqPriceDisplay =
    position.liquidationPrice != null
      ? formatPerpsFiat(position.liquidationPrice, {
          ranges: PRICE_RANGES_UNIVERSAL,
        })
      : PERPS_CONSTANTS.FallbackPriceDisplay;
  const marginDisplay = formatPerpsFiat(position.marginUsed, {
    ranges: PRICE_RANGES_MINIMAL_VIEW,
  });

  const hasTakeProfit =
    Boolean(position.takeProfitPrice) &&
    parseFloat(position.takeProfitPrice as string) > 0;
  const hasStopLoss =
    Boolean(position.stopLossPrice) &&
    parseFloat(position.stopLossPrice as string) > 0;
  const tpDisplay = hasTakeProfit
    ? formatPerpsPrice(position.takeProfitPrice as string)
    : PERPS_CONSTANTS.FallbackPriceDisplay;
  const slDisplay = hasStopLoss
    ? formatPerpsPrice(position.stopLossPrice as string)
    : PERPS_CONSTANTS.FallbackPriceDisplay;
  const tpSlDisplay = `${tpDisplay} / ${slDisplay}`;

  // Positive cumulative funding is a cost (paid), negative is a payment (earned).
  const fundingSinceOpen = parseFloat(
    position.cumulativeFunding?.sinceOpen ?? '0',
  );
  const isNearZeroFunding = Math.abs(fundingSinceOpen) < 0.005;
  let fundingColor: TextColor = TextColor.TextDefault;
  if (!isNearZeroFunding && fundingSinceOpen > 0) {
    fundingColor = TextColor.ErrorDefault;
  } else if (!isNearZeroFunding && fundingSinceOpen < 0) {
    fundingColor = TextColor.SuccessDefault;
  }
  const fundingDisplay = isNearZeroFunding
    ? formatPerpsFiat(0, { ranges: PRICE_RANGES_MINIMAL_VIEW })
    : `${fundingSinceOpen >= 0 ? '-' : '+'}${formatPerpsFiat(
        Math.abs(fundingSinceOpen),
        { ranges: PRICE_RANGES_MINIMAL_VIEW },
      )}`;

  const positionValueDisplay = formatPerpsFiat(position.positionValue, {
    ranges: PRICE_RANGES_MINIMAL_VIEW,
  });

  const handlePress = onPress ? () => onPress(position) : undefined;

  return (
    // The card owns nested buttons and inline-editable values, so this wrapper
    // stays out of the accessibility tree to avoid collapsing them into a
    // single element. The header below repeats the handler as the labelled,
    // screen-reader-reachable entry point for the same action.
    <Pressable
      onPress={handlePress}
      disabled={!handlePress}
      accessible={false}
      testID={testID ?? PerpsProMarketViewSelectorsIDs.POSITION_ROW}
    >
      <Box twClassName="gap-3 py-3">
        {/* Header: asset, direction, size, unrealized PnL */}
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
            twClassName="gap-4 px-2"
          >
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              twClassName="flex-1 gap-4"
            >
              <PerpsTokenLogo symbol={position.symbol} size={40} />
              <Box twClassName="flex-1">
                <Box
                  flexDirection={BoxFlexDirection.Row}
                  alignItems={BoxAlignItems.Center}
                  twClassName="gap-1"
                >
                  <Text
                    variant={TextVariant.BodyMd}
                    fontWeight={FontWeight.Medium}
                    color={TextColor.TextDefault}
                  >
                    {displaySymbol}
                  </Text>
                  <Tag
                    severity={directionSeverity}
                  >{`${position.leverage.value}x ${directionLabel}`}</Tag>
                </Box>
                <SensitiveText
                  variant={TextVariant.BodySm}
                  fontWeight={FontWeight.Medium}
                  color={TextColor.TextAlternative}
                  isHidden={privacyMode}
                  length={SensitiveTextLength.Short}
                >
                  {`${formatPositionSize(
                    absoluteSize.toString(),
                  )} ${displaySymbol} • ${positionValueDisplay}`}
                </SensitiveText>
              </Box>
            </Box>
            <SensitiveText
              variant={TextVariant.BodyMdMedium}
              color={
                privacyMode
                  ? TextColor.TextDefault
                  : pnlNum >= 0
                    ? TextColor.SuccessDefault
                    : TextColor.ErrorDefault
              }
              isHidden={privacyMode}
              length={SensitiveTextLength.Short}
              testID="pnl-text"
            >
              {`${formatPnl(pnlNum)} (${formatPercentage(roe, 1)})`}
            </SensitiveText>
          </Box>
        </Pressable>

        {/* Summary: key figures in three columns */}
        <Box twClassName="px-2">
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="gap-4 rounded-xl border border-muted px-4 py-2"
          >
            <Box twClassName="flex-1 gap-6">
              <KeyValueItem
                label={strings('perps.pro_positions_panel.card.entry_price')}
                value={entryPriceDisplay}
                isHidden={privacyMode}
              />
              <KeyValueItem
                label={strings('perps.pro_positions_panel.card.margin')}
                value={marginDisplay}
                isHidden={privacyMode}
                labelAccessory={
                  <Tag severity={TagSeverity.Neutral}>{marginTypeLabel}</Tag>
                }
                onValuePress={
                  canEditMargin ? () => onEditMargin?.(position) : undefined
                }
                isValuePressDisabled={isEditMarginDisabled}
                valuePressTestID={
                  PerpsProMarketViewSelectorsIDs.POSITION_EDIT_MARGIN
                }
                valuePressAccessibilityLabel={strings(
                  'perps.adjust_margin.title',
                )}
                showEditIcon={canEditMargin}
              />
            </Box>
            <Box twClassName="min-w-[128px] gap-6">
              <KeyValueItem
                label={strings('perps.pro_positions_panel.card.mark_price')}
                value={markPriceDisplay}
                isHidden={privacyMode}
              />
              <KeyValueItem
                label={strings('perps.pro_positions_panel.card.tp_sl')}
                value={tpSlDisplay}
                isHidden={privacyMode}
                onValuePress={
                  onEditTpSl ? () => onEditTpSl(position) : undefined
                }
                isValuePressDisabled={isEditTpSlDisabled}
                valuePressTestID={
                  PerpsProMarketViewSelectorsIDs.POSITION_EDIT_TPSL
                }
                valuePressAccessibilityLabel={strings(
                  'perps.position.card.edit_tpsl',
                )}
                showEditIcon={Boolean(onEditTpSl)}
              />
            </Box>
            <Box twClassName="gap-6">
              <KeyValueItem
                label={strings('perps.pro_positions_panel.card.liq_price')}
                value={liqPriceDisplay}
                isHidden={privacyMode}
              />
              <KeyValueItem
                label={strings('perps.pro_positions_panel.card.funding')}
                value={fundingDisplay}
                valueColor={fundingColor}
                isHidden={privacyMode}
              />
            </Box>
          </Box>
        </Box>

        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="gap-2 px-2"
        >
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Sm}
            isDanger
            startIconName={IconName.Close}
            twClassName={ACTION_BUTTON_CLASS_NAME}
            onPress={() => onClose?.(position)}
            testID={PerpsProMarketViewSelectorsIDs.POSITION_CLOSE}
          >
            {strings('perps.pro_positions_panel.card.close')}
          </Button>
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Sm}
            startIconName={IconName.Refresh}
            twClassName={ACTION_BUTTON_CLASS_NAME}
            onPress={() => onReverse?.(position)}
            testID={PerpsProMarketViewSelectorsIDs.POSITION_REVERSE}
          >
            {strings('perps.pro_positions_panel.card.reverse')}
          </Button>
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Sm}
            startIconName={IconName.Share}
            twClassName={ACTION_BUTTON_CLASS_NAME}
            onPress={() => onShare?.(position)}
            testID={PerpsProMarketViewSelectorsIDs.POSITION_SHARE}
          >
            {strings('perps.pro_positions_panel.card.share')}
          </Button>
        </Box>
      </Box>
    </Pressable>
  );
};

export default React.memo(PerpsProPositionCard);
