import React, { useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { PerpsPositionCardSelectorsIDs } from '../../Perps.testIds';
import { strings } from '../../../../../../locales/i18n';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonIcon,
  ButtonIconSize,
  ButtonIconVariant,
  ButtonSize,
  ButtonVariant,
  Card,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  KeyValueRow,
  KeyValueRowVariant,
  SectionDivider,
  SectionHeader,
  SensitiveText,
  SensitiveTextLength,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { selectPrivacyMode } from '../../../../../selectors/preferencesController';
import {
  PERPS_CONSTANTS,
  getPerpsDisplaySymbol,
  type Order,
  type Position,
} from '@metamask/perps-controller';
import {
  formatPerpsFiat,
  formatPnl,
  formatPositionSize,
  formatPerpsPrice,
  PRICE_RANGES_MINIMAL_VIEW,
  PRICE_RANGES_UNIVERSAL,
} from '../../utils/formatUtils';

/**
 * PerpsPositionCard Component
 *
 * Displays open position details with interactive controls for position management.
 *
 * @component
 *
 * @remarks
 * **Callback Requirements by Context:**
 * - **View-Only Mode** (no callbacks): Shows position data only, no interactive elements
 * - **Interactive Mode** (with callbacks): Enables position management actions
 *
 * **Interactive Callbacks:**
 * - `onAutoClosePress`: Required for TP/SL configuration - opens auto-close settings
 * - `onMarginPress`: Required for margin adjustment - opens add/remove margin flow
 * - `onSharePress`: Optional - enables sharing position P&L card
 * - `onFlipPress`: Not currently used (flip handled via modify action sheet)
 *
 * @example
 * // View-only mode
 * <PerpsPositionCard position={position} currentPrice={price} />
 *
 * @example
 * // Interactive mode
 * <PerpsPositionCard
 *   position={position}
 *   currentPrice={price}
 *   onAutoClosePress={() => navigateToTPSL(position)}
 *   onMarginPress={() => setShowAdjustMarginSheet(true)}
 *   onSharePress={() => navigateToPnlShare(position)}
 * />
 */
interface PerpsPositionCardProps {
  position: Position;
  orders?: Order[];
  showIcon?: boolean;
  currentPrice?: number;
  autoCloseEnabled?: boolean;
  onAutoClosePress?: () => void;
  onFlipPress?: () => void;
  onMarginPress?: () => void;
  onSharePress?: () => void;
  /** Test ID for the card */
  testID?: string;
  /** Market size decimals, used to derive Hyperliquid price precision for TP/SL display. */
  szDecimals?: number | null;
}

const PerpsPositionCard: React.FC<PerpsPositionCardProps> = ({
  position,
  orders,
  currentPrice,
  autoCloseEnabled: _autoCloseEnabled = false,
  onAutoClosePress,
  onFlipPress: _onFlipPress,
  onMarginPress,
  onSharePress,
  testID,
  szDecimals,
}) => {
  const [showSizeInUSD, setShowSizeInUSD] = useState(false);
  const privacyMode = useSelector(selectPrivacyMode);

  // Determine if position is long or short based on size
  const isLong = parseFloat(position.size) >= 0;
  const direction = isLong ? 'long' : 'short';
  const absoluteSize = Math.abs(parseFloat(position.size));

  const pnlNum = parseFloat(position.unrealizedPnl);

  // ROE is always stored as a decimal (e.g., 0.171 for 17.10%)
  // Convert to percentage for display
  const roeValue = parseFloat(position.returnOnEquity || '0');
  const roe = isNaN(roeValue) ? 0 : roeValue * 100;

  // Funding cost (cumulative since open) formatting logic
  const fundingSinceOpenRaw = position.cumulativeFunding?.sinceOpen ?? '0';
  const fundingSinceOpen = parseFloat(fundingSinceOpenRaw);
  const isNearZeroFunding = Math.abs(fundingSinceOpen) < 0.005; // Threshold: |value| < $0.005 -> display $0.00

  // Keep original color logic: exact zero = neutral, positive = cost (Error), negative = payment (Success)
  let fundingColorFromValue: TextColor = TextColor.TextDefault;
  if (fundingSinceOpen > 0) {
    fundingColorFromValue = TextColor.ErrorDefault;
  } else if (fundingSinceOpen < 0) {
    fundingColorFromValue = TextColor.SuccessDefault;
  }
  const fundingColor = isNearZeroFunding
    ? TextColor.TextDefault
    : fundingColorFromValue;

  const fundingSignPrefix = fundingSinceOpen >= 0 ? '-' : '+';
  const fundingDisplay = isNearZeroFunding
    ? '$0.00'
    : `${fundingSignPrefix}${formatPerpsFiat(Math.abs(fundingSinceOpen), {
        ranges: PRICE_RANGES_MINIMAL_VIEW,
      })}`;

  const handleSizeToggle = () => {
    setShowSizeInUSD(!showSizeInUSD);
  };

  // Calculate liquidation distance percentage
  const liquidationDistance = useMemo(() => {
    if (!currentPrice || !position.liquidationPrice) return null;
    const liqPrice = parseFloat(String(position.liquidationPrice));
    if (liqPrice <= 0 || currentPrice <= 0) return null;
    return (Math.abs(currentPrice - liqPrice) / currentPrice) * 100;
  }, [currentPrice, position.liquidationPrice]);

  // Resolve TP/SL from position-level or parent order-level values
  const resolvedTPSL = useMemo(() => {
    let takeProfitPrice = position.takeProfitPrice;
    let stopLossPrice = position.stopLossPrice;

    if ((!takeProfitPrice || !stopLossPrice) && orders && orders.length > 0) {
      const parentOrder = orders.find(
        (order) =>
          order.symbol === position.symbol &&
          !order.isTrigger &&
          (order.takeProfitPrice || order.stopLossPrice),
      );

      if (parentOrder) {
        takeProfitPrice = takeProfitPrice || parentOrder.takeProfitPrice;
        stopLossPrice = stopLossPrice || parentOrder.stopLossPrice;
      }
    }

    const hasTakeProfit = Boolean(
      takeProfitPrice && parseFloat(takeProfitPrice) > 0,
    );
    const hasStopLoss = Boolean(stopLossPrice && parseFloat(stopLossPrice) > 0);

    return {
      takeProfitPrice,
      stopLossPrice,
      hasTakeProfit,
      hasStopLoss,
      hasTPSLConfigured: hasTakeProfit || hasStopLoss,
    };
  }, [
    position.takeProfitPrice,
    position.stopLossPrice,
    position.symbol,
    orders,
  ]);

  const handleAutoCloseButtonPress = () => {
    if (onAutoClosePress) {
      onAutoClosePress();
    }
  };

  const sectionTitle = onSharePress ? (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Between}
      twClassName="w-full"
    >
      <Text variant={TextVariant.HeadingMd} color={TextColor.TextDefault}>
        {strings('perps.position.card.position_title')}
      </Text>
      <ButtonIcon
        size={ButtonIconSize.Sm}
        iconName={IconName.Share}
        onPress={onSharePress}
        testID={PerpsPositionCardSelectorsIDs.SHARE_BUTTON}
      />
    </Box>
  ) : (
    strings('perps.position.card.position_title')
  );

  const autoCloseDescription = (() => {
    const { takeProfitPrice, stopLossPrice, hasTakeProfit, hasStopLoss } =
      resolvedTPSL;

    if (hasTakeProfit || hasStopLoss) {
      const parts: string[] = [];

      if (hasTakeProfit && takeProfitPrice) {
        const tpPrice = formatPerpsPrice(takeProfitPrice, {
          szDecimals,
        });
        parts.push(`${strings('perps.order.tp')} ${tpPrice}`);
      }

      if (hasStopLoss && stopLossPrice) {
        const slPrice = formatPerpsPrice(stopLossPrice, {
          szDecimals,
        });
        parts.push(`${strings('perps.order.sl')} ${slPrice}`);
      }

      return (
        <SensitiveText
          variant={TextVariant.BodyMd}
          color={TextColor.TextDefault}
          isHidden={privacyMode}
          length={SensitiveTextLength.Short}
        >
          {parts.join(', ')}
        </SensitiveText>
      );
    }

    return (
      <Text variant={TextVariant.BodyMd} color={TextColor.TextDefault}>
        {strings('perps.auto_close.description')}
      </Text>
    );
  })();

  const liquidationValue = (
    <Box flexDirection={BoxFlexDirection.Row} alignItems={BoxAlignItems.Center}>
      <SensitiveText
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Medium}
        color={TextColor.TextDefault}
        isHidden={privacyMode}
        length={SensitiveTextLength.Short}
        testID={PerpsPositionCardSelectorsIDs.LIQUIDATION_PRICE_VALUE}
      >
        {position.liquidationPrice !== undefined &&
        position.liquidationPrice !== null
          ? formatPerpsFiat(position.liquidationPrice, {
              ranges: PRICE_RANGES_UNIVERSAL,
            })
          : PERPS_CONSTANTS.FallbackPriceDisplay}
      </SensitiveText>
      {liquidationDistance !== null && !privacyMode && (
        <>
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
            {' '}
            {Math.round(liquidationDistance)}%
          </Text>
          <Icon
            name={isLong ? IconName.TrendDown : IconName.TrendUp}
            size={IconSize.Sm}
            color={IconColor.IconAlternative}
          />
        </>
      )}
    </Box>
  );

  const cardTestID = testID ?? PerpsPositionCardSelectorsIDs.CARD;

  return (
    <Box paddingBottom={3}>
      <Box twClassName="bg-background-default rounded-xl" testID={cardTestID}>
        <SectionHeader
          title={sectionTitle}
          titleWrapperProps={
            onSharePress ? { twClassName: 'w-full' } : undefined
          }
          testID={PerpsPositionCardSelectorsIDs.HEADER}
        />

        <Box paddingHorizontal={4}>
          {/* P&L Section - Two cards side by side */}
          <Box flexDirection={BoxFlexDirection.Row} gap={2} twClassName="mb-2">
            <Card
              twClassName="flex-1 bg-background-section rounded-lg p-3 border-0 gap-1"
              testID={PerpsPositionCardSelectorsIDs.PNL_CARD}
            >
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
              >
                {strings('perps.position.card.pnl_label')}
              </Text>
              <SensitiveText
                variant={TextVariant.BodyMd}
                color={
                  privacyMode
                    ? TextColor.TextDefault
                    : pnlNum >= 0
                      ? TextColor.SuccessDefault
                      : TextColor.ErrorDefault
                }
                testID={PerpsPositionCardSelectorsIDs.PNL_VALUE}
                isHidden={privacyMode}
                length={SensitiveTextLength.Short}
              >
                {formatPnl(pnlNum)}
              </SensitiveText>
            </Card>

            <Card
              twClassName="flex-1 bg-background-section rounded-lg p-3 border-0 gap-1"
              testID={PerpsPositionCardSelectorsIDs.RETURN_CARD}
            >
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
              >
                {strings('perps.position.card.return_label')}
              </Text>
              <SensitiveText
                variant={TextVariant.BodyMd}
                color={
                  privacyMode
                    ? TextColor.TextDefault
                    : roe >= 0
                      ? TextColor.SuccessDefault
                      : TextColor.ErrorDefault
                }
                testID={PerpsPositionCardSelectorsIDs.RETURN_VALUE}
                isHidden={privacyMode}
                length={SensitiveTextLength.Short}
              >
                {roe >= 0 ? '+' : ''}
                {roe.toFixed(2)}%
              </SensitiveText>
            </Card>
          </Box>

          {/* Size/Margin Row */}
          <Box flexDirection={BoxFlexDirection.Row} gap={2} twClassName="mb-2">
            <Card
              onPress={handleSizeToggle}
              twClassName="flex-1 flex-row items-center justify-between bg-background-section rounded-lg p-3 border-0"
              testID={PerpsPositionCardSelectorsIDs.SIZE_CONTAINER}
            >
              <Box twClassName="flex-1 gap-1">
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.TextAlternative}
                >
                  {strings('perps.position.card.size_label')}
                </Text>
                <SensitiveText
                  variant={TextVariant.BodyMd}
                  color={TextColor.TextDefault}
                  testID={PerpsPositionCardSelectorsIDs.SIZE_VALUE}
                  isHidden={privacyMode}
                  length={SensitiveTextLength.Short}
                >
                  {showSizeInUSD && currentPrice
                    ? formatPerpsFiat(absoluteSize * currentPrice, {
                        ranges: PRICE_RANGES_MINIMAL_VIEW,
                      })
                    : `${formatPositionSize(absoluteSize.toString())} ${getPerpsDisplaySymbol(position.symbol)}`}
                </SensitiveText>
              </Box>
              <ButtonIcon
                iconName={IconName.SwapHorizontal}
                size={ButtonIconSize.Sm}
                variant={ButtonIconVariant.Filled}
                onPress={handleSizeToggle}
                testID={PerpsPositionCardSelectorsIDs.FLIP_ICON}
              />
            </Card>

            <Card
              onPress={onMarginPress}
              twClassName="flex-1 flex-row items-center justify-between bg-background-section rounded-lg p-3 border-0"
              testID={PerpsPositionCardSelectorsIDs.MARGIN_CONTAINER}
              touchableOpacityProps={{ disabled: !onMarginPress }}
            >
              <Box twClassName="flex-1 gap-1">
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.TextAlternative}
                >
                  {strings('perps.position.card.margin_label')}
                </Text>
                <SensitiveText
                  variant={TextVariant.BodyMd}
                  color={TextColor.TextDefault}
                  testID={PerpsPositionCardSelectorsIDs.MARGIN_VALUE}
                  isHidden={privacyMode}
                  length={SensitiveTextLength.Short}
                >
                  {formatPerpsFiat(position.marginUsed, {
                    ranges: PRICE_RANGES_MINIMAL_VIEW,
                  })}
                </SensitiveText>
              </Box>
              {onMarginPress && (
                <ButtonIcon
                  iconName={IconName.ArrowRight}
                  size={ButtonIconSize.Sm}
                  variant={ButtonIconVariant.Filled}
                  onPress={onMarginPress}
                  testID={PerpsPositionCardSelectorsIDs.MARGIN_CHEVRON}
                />
              )}
            </Card>
          </Box>

          {/* Auto Close Section */}
          <Card
            onPress={handleAutoCloseButtonPress}
            twClassName="flex-row items-center justify-between bg-background-section rounded-lg p-3 border-0 mb-3"
            testID={PerpsPositionCardSelectorsIDs.AUTO_CLOSE_TOGGLE}
            touchableOpacityProps={{
              activeOpacity: 0.7,
              disabled: !onAutoClosePress,
            }}
          >
            <Box twClassName="flex-1 gap-1">
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.TextAlternative}
              >
                {strings('perps.auto_close.title')}
              </Text>
              {autoCloseDescription}
            </Box>
            {onAutoClosePress && (
              <Button
                variant={ButtonVariant.Secondary}
                size={ButtonSize.Sm}
                onPress={handleAutoCloseButtonPress}
                twClassName="self-center rounded-lg"
              >
                {resolvedTPSL.hasTPSLConfigured
                  ? strings('perps.auto_close.edit_button')
                  : strings('perps.auto_close.set_button')}
              </Button>
            )}
          </Card>
        </Box>

        <SectionDivider />
        <SectionHeader title={strings('perps.position.card.details_title')} />
        <Box
          testID={PerpsPositionCardSelectorsIDs.DETAILS_SECTION}
          twClassName="px-4"
        >
          <KeyValueRow
            variant={KeyValueRowVariant.Summary}
            keyLabel={strings('perps.position.card.direction_label')}
            value={`${
              direction === 'long'
                ? strings('perps.market.long')
                : strings('perps.market.short')
            } ${position.leverage.value}x`}
            valueTextProps={{
              testID: PerpsPositionCardSelectorsIDs.DIRECTION_VALUE,
            }}
          />

          <KeyValueRow
            variant={KeyValueRowVariant.Summary}
            keyLabel={strings('perps.position.card.entry_label')}
            value={
              <SensitiveText
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Medium}
                color={TextColor.TextDefault}
                isHidden={privacyMode}
                length={SensitiveTextLength.Short}
                testID={PerpsPositionCardSelectorsIDs.ENTRY_VALUE}
              >
                {formatPerpsFiat(position.entryPrice, {
                  ranges: PRICE_RANGES_UNIVERSAL,
                })}
              </SensitiveText>
            }
          />

          <KeyValueRow
            variant={KeyValueRowVariant.Summary}
            keyLabel={strings('perps.position.card.liquidation_price_label')}
            value={liquidationValue}
          />

          <KeyValueRow
            variant={KeyValueRowVariant.Summary}
            keyLabel={strings('perps.position.card.funding_payments_label')}
            value={
              <SensitiveText
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Medium}
                color={privacyMode ? TextColor.TextDefault : fundingColor}
                isHidden={privacyMode}
                length={SensitiveTextLength.Short}
                testID={PerpsPositionCardSelectorsIDs.FUNDING_PAYMENTS_VALUE}
              >
                {fundingDisplay}
              </SensitiveText>
            }
          />
        </Box>
      </Box>
    </Box>
  );
};

export default React.memo(PerpsPositionCard);
