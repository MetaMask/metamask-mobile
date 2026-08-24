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
  getPerpsDisplaySymbol,
  PERPS_CONSTANTS,
  type Order,
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
import { isClosingOrder } from '../../../utils/orderDirection';
import {
  formatOrderTypeLabel,
  getOrderPositionDirection,
  getValidTriggerPrice,
  inferTriggerConditionKey,
  isTriggerOrder,
  resolveOrderDisplayPriceAndLabel,
} from '../../../utils/orderUtils';

interface PerpsProOrderCardProps {
  order: Order;
  testID?: string;
  /** Switches the Pro screen to this order's market. */
  onPress?: (order: Order) => void;
  onCancel?: (order: Order) => void;
  onEditPrice?: (order: Order) => void;
  onEditSize?: (order: Order) => void;
  isCancelDisabled?: boolean;
  isEditPriceDisabled?: boolean;
  isEditSizeDisabled?: boolean;
}

interface KeyValueItemProps {
  label: string;
  value: string;
  isHidden?: boolean;
  onValuePress?: () => void;
  valuePressTestID?: string;
  valuePressAccessibilityLabel?: string;
  showEditIcon?: boolean;
}

const KeyValueItem = ({
  label,
  value,
  isHidden = false,
  onValuePress,
  valuePressTestID,
  valuePressAccessibilityLabel,
  showEditIcon = false,
}: KeyValueItemProps) => {
  const valueContent = (
    <SensitiveText
      variant={TextVariant.BodyXs}
      fontWeight={FontWeight.Medium}
      isHidden={isHidden}
      length={SensitiveTextLength.Short}
    >
      {value}
    </SensitiveText>
  );

  return (
    <Box>
      <Text variant={TextVariant.BodyXs} color={TextColor.TextAlternative}>
        {label}
      </Text>
      {onValuePress ? (
        <Pressable
          onPress={onValuePress}
          testID={valuePressTestID}
          accessibilityRole="button"
          accessibilityLabel={valuePressAccessibilityLabel}
        >
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            // Long values (e.g. "205.02 CASHCAT") can wrap to two lines in
            // this narrow column; flex-wrap keeps the edit icon within the
            // column bounds (dropping to its own line) instead of
            // overflowing into the neighboring column.
            twClassName="flex-wrap gap-1"
          >
            {valueContent}
            {showEditIcon ? (
              <Icon name={IconName.Edit} size={IconSize.Sm} />
            ) : null}
          </Box>
        </Pressable>
      ) : (
        valueContent
      )}
    </Box>
  );
};

const formatOptionalPrice = (price?: string): string => {
  const parsedPrice = Number.parseFloat(price ?? '');
  return Number.isFinite(parsedPrice) && parsedPrice > 0
    ? formatPerpsFiat(parsedPrice, { ranges: PRICE_RANGES_UNIVERSAL })
    : PERPS_CONSTANTS.FallbackPriceDisplay;
};

/**
 * Summary of an open perps order in the Pro market view with cancel and
 * in-place limit price and size edit actions when the venue allows.
 */
const PerpsProOrderCard = ({
  order,
  testID,
  onPress,
  onCancel,
  onEditPrice,
  onEditSize,
  isCancelDisabled = false,
  isEditPriceDisabled = false,
  isEditSizeDisabled = false,
}: PerpsProOrderCardProps) => {
  const privacyMode = useSelector(selectPrivacyMode);
  const displaySymbol = getPerpsDisplaySymbol(order.symbol);
  const isClosing = isClosingOrder(order);
  const positionDirection = getOrderPositionDirection(order);
  const isBuySide = order.side === 'buy';
  const isLongPosition = positionDirection === 'long';
  let directionLabel = isLongPosition
    ? strings('perps.market.long')
    : strings('perps.market.short');
  if (isClosing) {
    directionLabel = isLongPosition
      ? strings('perps.market.close_long')
      : strings('perps.market.close_short');
  }
  const directionSeverity = isBuySide
    ? TagSeverity.Success
    : TagSeverity.Danger;
  const size = formatPositionSize(order.originalSize);
  const { priceValue } = resolveOrderDisplayPriceAndLabel(order);
  const validTriggerPrice = getValidTriggerPrice(order);
  const canEditPrice = Boolean(onEditPrice) && !isEditPriceDisabled;
  const canEditSize = Boolean(onEditSize) && !isEditSizeDisabled;
  const orderValue =
    priceValue === null
      ? PERPS_CONSTANTS.FallbackPriceDisplay
      : formatPerpsFiat(Number.parseFloat(order.originalSize) * priceValue, {
          ranges: PRICE_RANGES_UNIVERSAL,
        });
  const price =
    priceValue === null
      ? strings('perps.order.market')
      : formatPerpsFiat(priceValue, {
          ranges: PRICE_RANGES_UNIVERSAL,
        });
  // Figma (Stop card): "Price below $101.00". Non-trigger: fallback display.
  let triggerCondition = PERPS_CONSTANTS.FallbackPriceDisplay;
  if (isTriggerOrder(order) && validTriggerPrice !== null) {
    const conditionKey = inferTriggerConditionKey({
      detailedOrderType: order.detailedOrderType,
      side: order.side,
      triggerPrice: order.triggerPrice,
      price: order.price,
    });
    if (conditionKey) {
      triggerCondition = strings(conditionKey, {
        price: formatPerpsFiat(validTriggerPrice, {
          ranges: PRICE_RANGES_UNIVERSAL,
          minimumDecimals: 2,
          stripTrailingZeros: false,
        }),
      });
    }
  }
  const tpSl = `${formatOptionalPrice(
    order.takeProfitPrice,
  )} / ${formatOptionalPrice(order.stopLossPrice)}`;

  const handlePress = onPress ? () => onPress(order) : undefined;

  const handleEditPricePress = () => {
    onEditPrice?.(order);
  };

  const handleEditSizePress = () => {
    onEditSize?.(order);
  };

  return (
    // The card owns cancel/edit buttons, so this wrapper stays out of the
    // accessibility tree to avoid collapsing it into a single element. The
    // header below repeats the handler as the labelled, screen-reader-reachable
    // entry point for the same action.
    <Pressable
      onPress={handlePress}
      disabled={!handlePress}
      accessible={false}
      testID={testID ?? PerpsProMarketViewSelectorsIDs.ORDER_ROW}
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
              <PerpsTokenLogo symbol={order.symbol} size={40} />
              <Box>
                <Box
                  flexDirection={BoxFlexDirection.Row}
                  alignItems={BoxAlignItems.Center}
                  twClassName="gap-1"
                >
                  <Text
                    variant={TextVariant.BodyMd}
                    fontWeight={FontWeight.Medium}
                  >
                    {displaySymbol}
                  </Text>
                  <Tag
                    testID={PerpsProMarketViewSelectorsIDs.ORDER_DIRECTION_TAG}
                    severity={directionSeverity}
                  >
                    {directionLabel}
                  </Tag>
                </Box>
                <Text
                  variant={TextVariant.BodySm}
                  fontWeight={FontWeight.Medium}
                  color={TextColor.TextAlternative}
                >
                  {formatProOrderCardTimestamp(order.timestamp)}
                </Text>
              </Box>
            </Box>
            <Tag
              severity={TagSeverity.Neutral}
              testID={PerpsProMarketViewSelectorsIDs.ORDER_TYPE}
            >
              {formatOrderTypeLabel(order)}
            </Tag>
          </Box>
        </Pressable>

        <Box twClassName="px-2">
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="gap-4 rounded-xl border border-muted px-4 py-2"
          >
            <Box twClassName="flex-1 gap-6">
              <KeyValueItem
                label={strings('perps.pro_positions_panel.order_card.size')}
                value={`${size} ${displaySymbol}`}
                onValuePress={canEditSize ? handleEditSizePress : undefined}
                valuePressTestID={
                  PerpsProMarketViewSelectorsIDs.ORDER_SIZE_EDIT
                }
                valuePressAccessibilityLabel={strings(
                  'perps.pro_positions_panel.order_card.edit_size',
                )}
                showEditIcon={canEditSize}
              />
              <KeyValueItem
                label={strings(
                  'perps.pro_positions_panel.order_card.reduce_only',
                )}
                value={
                  order.reduceOnly
                    ? strings('perps.order_details.yes')
                    : strings('perps.order_details.no')
                }
              />
            </Box>
            <Box twClassName="flex-1 gap-6">
              <KeyValueItem
                label={strings(
                  'perps.pro_positions_panel.order_card.order_value',
                )}
                value={orderValue}
                isHidden={privacyMode}
              />
              <KeyValueItem
                label={strings('perps.pro_positions_panel.order_card.tp_sl')}
                value={tpSl}
                isHidden={privacyMode}
              />
            </Box>
            <Box twClassName="min-w-[120px] gap-6">
              <KeyValueItem
                label={strings('perps.pro_positions_panel.order_card.price')}
                value={price}
                isHidden={privacyMode}
                onValuePress={canEditPrice ? handleEditPricePress : undefined}
                valuePressTestID={
                  PerpsProMarketViewSelectorsIDs.ORDER_PRICE_EDIT
                }
                valuePressAccessibilityLabel={strings(
                  'perps.pro_positions_panel.order_card.edit_price',
                )}
                showEditIcon={canEditPrice}
              />
              <KeyValueItem
                label={strings(
                  'perps.pro_positions_panel.order_card.trigger_condition',
                )}
                value={triggerCondition}
                isHidden={privacyMode}
              />
            </Box>
          </Box>
        </Box>

        <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-2 px-2">
          {onEditPrice && !isEditPriceDisabled ? (
            <Button
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Sm}
              startIconName={IconName.Edit}
              twClassName="flex-1 border-muted bg-background-default"
              onPress={handleEditPricePress}
              testID={PerpsProMarketViewSelectorsIDs.ORDER_EDIT}
            >
              {strings('perps.pro_positions_panel.order_card.edit')}
            </Button>
          ) : null}
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Sm}
            isDanger
            startIconName={IconName.Close}
            twClassName="flex-1 border-muted bg-background-default"
            onPress={() => onCancel?.(order)}
            isDisabled={isCancelDisabled}
            testID={PerpsProMarketViewSelectorsIDs.ORDER_CANCEL}
          >
            {strings('perps.pro_positions_panel.order_card.cancel')}
          </Button>
        </Box>
      </Box>
    </Pressable>
  );
};

export default React.memo(PerpsProOrderCard);
