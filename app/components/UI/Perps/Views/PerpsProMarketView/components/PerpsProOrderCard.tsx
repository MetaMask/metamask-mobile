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
  isCancelDisabled?: boolean;
}

interface KeyValueItemProps {
  label: string;
  value: string;
  isHidden?: boolean;
}

const KeyValueItem = ({
  label,
  value,
  isHidden = false,
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
    >
      {value}
    </SensitiveText>
  </Box>
);

const formatOptionalPrice = (price?: string): string => {
  const parsedPrice = Number.parseFloat(price ?? '');
  return Number.isFinite(parsedPrice) && parsedPrice > 0
    ? formatPerpsFiat(parsedPrice, { ranges: PRICE_RANGES_UNIVERSAL })
    : PERPS_CONSTANTS.FallbackPriceDisplay;
};

/**
 * Read-only summary of an open perps order in the Pro market view.
 */
const PerpsProOrderCard = ({
  order,
  testID,
  onPress,
  onCancel,
  isCancelDisabled = false,
}: PerpsProOrderCardProps) => {
  const privacyMode = useSelector(selectPrivacyMode);
  const displaySymbol = getPerpsDisplaySymbol(order.symbol);
  const direction = getOrderPositionDirection(order);
  const isLong = direction === 'long';
  const size = formatPositionSize(order.originalSize);
  const { priceValue } = resolveOrderDisplayPriceAndLabel(order);
  const validTriggerPrice = getValidTriggerPrice(order);
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

  return (
    // The card owns a cancel button, so this wrapper stays out of the
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
                    severity={isLong ? TagSeverity.Success : TagSeverity.Danger}
                  >
                    {isLong
                      ? strings('perps.market.long')
                      : strings('perps.market.short')}
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
            <Tag severity={TagSeverity.Neutral}>
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

        <Box twClassName="px-2">
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Sm}
            isDanger
            startIconName={IconName.Close}
            twClassName="w-full border-muted bg-background-default"
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
