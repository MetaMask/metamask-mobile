import {
  BannerAlert,
  BannerAlertSeverity,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  ButtonBase,
  ButtonBaseSize,
  ButtonIcon,
  ButtonIconSize,
  ButtonSemantic,
  ButtonSemanticSeverity,
  Checkbox,
  FilterButton,
  FontWeight,
  HelpText,
  HelpTextSeverity,
  Icon,
  IconColor,
  IconName,
  IconSize,
  KeyValueRow,
  SegmentedControl,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import {
  PERPS_CONSTANTS,
  isLimitExecutionOrderType,
  isTriggerOrderType,
} from '@metamask/perps-controller';
import React, { useCallback, useRef } from 'react';
import {
  Pressable,
  type KeyboardTypeOptions,
  type TextInput,
  type View,
} from 'react-native';
import { strings } from '../../../../../../../../locales/i18n';
import { useHaptics } from '../../../../../../../util/haptics';
import {
  formatPerpsFiat,
  PRICE_RANGES_UNIVERSAL,
} from '../../../../utils/formatUtils';
import {
  PerpsProMarketViewSelectorsIDs,
  PerpsProOrderFormSelectorsIDs,
} from '../../../../Perps.testIds';
import PerpsFeesDisplay from '../../../../components/PerpsFeesDisplay';
import PerpsProCompactInput, {
  PerpsProInputKeyboardAccessory,
} from './PerpsProCompactInput';
import PerpsProSizeInput from './PerpsProSizeInput';
import PerpsProTwapFields from './PerpsProTwapFields';
import type {
  PerpsProOrderDirection,
  PerpsProOrderFormProps,
  PerpsProOrderNotice,
  PerpsProOrderSummaryProps,
  PerpsProScaleOrderModel,
} from './PerpsProOrderForm.types';

const ids = PerpsProOrderFormSelectorsIDs;
const formatScalePrice = (price: string) =>
  formatPerpsFiat(price, { ranges: PRICE_RANGES_UNIVERSAL });

const buttonIcon = (iconName: IconName, testID: string, onPress?: () => void) =>
  ({
    iconName,
    onPress,
    isDisabled: !onPress,
    size: ButtonIconSize.Xs,
    testID,
  }) as const;

const summaryKeyTextProps = {
  variant: TextVariant.BodyXs,
  fontWeight: FontWeight.Regular,
};

const summaryValueTextProps = {
  variant: TextVariant.BodyXs,
  fontWeight: FontWeight.Medium,
};

interface TPSLRowProps {
  label: string;
  onPress?: () => void;
  testID: string;
}

const TPSLRow = ({ label, onPress, testID }: TPSLRowProps) => {
  const isDisabled = !onPress;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      accessibilityLabel={label}
      disabled={isDisabled}
      onPress={onPress}
      testID={testID}
    >
      <Box
        twClassName={`h-12 flex-row items-center justify-between rounded-xl bg-muted px-3${
          isDisabled ? ' opacity-50' : ''
        }`}
      >
        <Text variant={TextVariant.BodySm} fontWeight={FontWeight.Medium}>
          {label}
        </Text>
        <Icon
          name={IconName.ArrowDown}
          size={IconSize.Sm}
          color={IconColor.IconDefault}
          testID={`${testID}-arrow`}
        />
      </Box>
    </Pressable>
  );
};

interface PriceFieldProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onFieldPress?: () => void;
  onUseMidPress?: () => void;
  testID: string;
  prefixTestID: string;
  midButtonTestID?: string;
  isHidden?: boolean;
}

const PriceField = ({
  label,
  value,
  onChangeText,
  onFocus,
  onBlur,
  onFieldPress,
  onUseMidPress,
  testID,
  prefixTestID,
  midButtonTestID,
  isHidden,
}: PriceFieldProps) => (
  <PerpsProCompactInput
    label={label}
    value={value}
    onChangeText={onChangeText}
    onFocus={onFocus}
    onBlur={onBlur}
    onFieldPress={onFieldPress}
    testID={testID}
    variant="inline"
    isHidden={isHidden}
    placeholder="0.00"
    startAccessory={
      <Text
        variant={TextVariant.BodySm}
        twClassName="mr-1"
        testID={prefixTestID}
      >
        $
      </Text>
    }
    endAccessory={
      onUseMidPress ? (
        <Box twClassName="h-full shrink-0 justify-center">
          <ButtonBase
            size={ButtonBaseSize.Sm}
            onPress={onUseMidPress}
            twClassName="h-[26px] shrink-0 rounded bg-subsection px-2 py-0.5"
            contentWrapperProps={{ twClassName: 'justify-end' }}
            textProps={{
              variant: TextVariant.BodySm,
              fontWeight: FontWeight.Medium,
            }}
            testID={midButtonTestID}
          >
            {strings('perps.order.limit_price_modal.mid_price')}
          </ButtonBase>
        </Box>
      ) : undefined
    }
  />
);

const Notices = ({ notices }: { notices: PerpsProOrderNotice[] }) =>
  notices.length > 0 ? (
    <Box twClassName="gap-2">
      {notices.map((notice) =>
        notice.variant === 'banner' ? (
          <BannerAlert
            key={notice.id}
            alignItems={BoxAlignItems.Center}
            severity={BannerAlertSeverity.Warning}
            title={notice.title}
            description={notice.message}
            testID={`${ids.NOTICE}-${notice.id}`}
          />
        ) : (
          <Text
            key={notice.id}
            variant={TextVariant.BodyXs}
            color={TextColor.ErrorDefault}
            testID={`${ids.NOTICE}-${notice.id}`}
          >
            {notice.message}
          </Text>
        ),
      )}
    </Box>
  ) : null;

const summaryRowClassName = 'h-5 px-0';
const summaryRangeRowClassName = 'min-h-10 h-auto px-0';
const summaryFeesRowClassName = 'min-h-6 h-auto px-0';
const summaryRowStyle = { paddingHorizontal: 0 } as const;
const SLIPPAGE_EDIT_HIT_SLOP = 12;

const OrderSummary = ({
  margin,
  liquidationPrice,
  slippage,
  fee,
  originalFee,
  feeDiscountPercentage,
  onSlippagePress,
  onFeesInfoPress,
}: PerpsProOrderSummaryProps) => (
  <Box twClassName="w-full gap-1" testID={ids.SUMMARY}>
    <KeyValueRow
      keyLabel={strings('perps.order.margin')}
      value={margin}
      keyTextProps={summaryKeyTextProps}
      valueTextProps={summaryValueTextProps}
      twClassName={summaryRowClassName}
      style={summaryRowStyle}
      testID={ids.SUMMARY_MARGIN}
    />
    <KeyValueRow
      keyLabel={strings('perps.pro_order_form.est_liquidation')}
      value={liquidationPrice}
      keyTextProps={summaryKeyTextProps}
      valueTextProps={summaryValueTextProps}
      twClassName={summaryRowClassName}
      style={summaryRowStyle}
      testID={ids.SUMMARY_LIQUIDATION}
    />
    {slippage !== undefined ? (
      <KeyValueRow
        keyLabel={strings('perps.slippage.slippage')}
        value={slippage}
        valueEndButtonIconProps={{
          ...buttonIcon(
            IconName.Edit,
            ids.SUMMARY_SLIPPAGE_BUTTON,
            onSlippagePress,
          ),
          accessibilityRole: 'button',
          accessibilityLabel: strings('perps.slippage.config_title'),
          // ButtonIconSize.Xs renders a 20pt box; 12pt of slop on each side
          // brings the tap target back to the 44pt minimum.
          hitSlop: SLIPPAGE_EDIT_HIT_SLOP,
        }}
        keyTextProps={summaryKeyTextProps}
        valueTextProps={summaryValueTextProps}
        twClassName={summaryRowClassName}
        style={summaryRowStyle}
        testID={ids.SUMMARY_SLIPPAGE}
      />
    ) : null}
    <KeyValueRow
      keyLabel={strings('perps.order.fees')}
      value={
        <PerpsFeesDisplay
          fee={fee}
          originalFee={originalFee}
          feeDiscountPercentage={feeDiscountPercentage}
          testID={ids.SUMMARY_FEES_VALUE}
          variant={TextVariant.BodyXs}
          color={TextColor.TextDefault}
          fontWeight={FontWeight.Medium}
        />
      }
      keyEndButtonIconProps={buttonIcon(
        IconName.Info,
        ids.SUMMARY_FEES_BUTTON,
        onFeesInfoPress,
      )}
      keyTextProps={summaryKeyTextProps}
      valueTextProps={summaryValueTextProps}
      twClassName={summaryFeesRowClassName}
      style={summaryRowStyle}
      testID={ids.SUMMARY_FEES}
    />
  </Box>
);

interface ScaleInputConfig {
  inputTestID: string;
  inputRef: React.RefObject<TextInput | null>;
  containerRef?: React.Ref<View>;
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  onFocus?: () => void;
  onBlur: () => void;
  onFieldPress?: () => void;
  startAccessory?: React.ReactNode;
  endAccessory?: React.ReactNode;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
}

const ScaleFields = ({
  inputs,
  isDisabled,
  isHidden,
}: {
  inputs: readonly ScaleInputConfig[];
  isDisabled: boolean;
  isHidden: boolean;
}) => (
  <Box
    testID={ids.SCALE_FIELDS}
    pointerEvents={isHidden ? 'none' : undefined}
    accessibilityElementsHidden={isHidden}
    importantForAccessibility={isHidden ? 'no-hide-descendants' : undefined}
    twClassName={isHidden ? 'h-0 overflow-hidden opacity-0' : undefined}
  >
    {inputs.map((input) => (
      <PerpsProCompactInput
        key={input.inputTestID}
        ref={input.inputRef}
        containerRef={input.containerRef}
        variant="inline-labeled"
        label={input.label}
        value={input.value}
        onChangeText={input.onChangeText}
        onFocus={input.onFocus}
        onBlur={input.onBlur}
        onFieldPress={input.onFieldPress}
        testID={input.inputTestID}
        startAccessory={input.startAccessory}
        endAccessory={input.endAccessory}
        placeholder={input.placeholder}
        keyboardType={input.keyboardType}
        isDisabled={isDisabled}
        isHidden={isHidden}
      />
    ))}
  </Box>
);

const ScalePreview = ({
  model,
  summary,
}: {
  model: PerpsProScaleOrderModel;
  summary: PerpsProOrderSummaryProps;
}) => {
  const first = model.rungs[0];
  const last = model.rungs[model.rungs.length - 1];
  return (
    <Box twClassName="gap-1" testID={ids.SCALE_PREVIEW}>
      <KeyValueRow
        keyLabel={strings('perps.pro_order_form.scale.start')}
        value={
          first
            ? formatScalePrice(first.price)
            : PERPS_CONSTANTS.FallbackPriceDisplay
        }
        keyTextProps={summaryKeyTextProps}
        valueTextProps={{
          ...summaryValueTextProps,
          testID: ids.SCALE_PREVIEW_START_VALUE,
        }}
        twClassName={summaryRowClassName}
        style={summaryRowStyle}
      />
      <KeyValueRow
        keyLabel={strings('perps.pro_order_form.scale.end')}
        value={
          last
            ? formatScalePrice(last.price)
            : PERPS_CONSTANTS.FallbackPriceDisplay
        }
        keyTextProps={summaryKeyTextProps}
        valueTextProps={{
          ...summaryValueTextProps,
          testID: ids.SCALE_PREVIEW_END_VALUE,
        }}
        twClassName={summaryRowClassName}
        style={summaryRowStyle}
      />
      <KeyValueRow
        keyLabel={strings('perps.pro_order_form.scale.margin')}
        value={model.marginRange}
        keyTextProps={summaryKeyTextProps}
        valueTextProps={{
          ...summaryValueTextProps,
          testID: ids.SCALE_PREVIEW_MARGIN_VALUE,
        }}
        twClassName={summaryRowClassName}
        style={summaryRowStyle}
      />
      <KeyValueRow
        keyLabel={strings('perps.pro_order_form.est_liquidation')}
        value={model.liquidationRange}
        keyTextProps={summaryKeyTextProps}
        valueTextProps={{
          ...summaryValueTextProps,
          numberOfLines: 0,
          testID: ids.SCALE_PREVIEW_LIQUIDATION_VALUE,
        }}
        twClassName={summaryRangeRowClassName}
        style={summaryRowStyle}
      />
      <KeyValueRow
        keyLabel={strings('perps.order.fees')}
        value={model.fees}
        keyEndButtonIconProps={buttonIcon(
          IconName.Info,
          ids.SUMMARY_FEES_BUTTON,
          summary.onFeesInfoPress,
        )}
        keyTextProps={summaryKeyTextProps}
        valueTextProps={{
          ...summaryValueTextProps,
          testID: ids.SCALE_PREVIEW_FEES_VALUE,
        }}
        twClassName={summaryFeesRowClassName}
        style={summaryRowStyle}
      />
    </Box>
  );
};

const PerpsProOrderForm = ({
  direction,
  onDirectionChange,
  isOrderBookCollapsed = false,
  onExpandOrderBook,
  marginModeLabel,
  onMarginModePress,
  leverageLabel,
  onLeveragePress,
  orderType,
  scaleOrder,
  scaleKeyboardScroll,
  onOrderTypeButtonPress,
  limitPrice,
  onLimitPriceChange,
  onLimitPriceFocus,
  onLimitPriceBlur,
  orderTypeCardRef,
  onLimitPriceFieldPress,
  onUseMidPricePress,
  triggerPrice = '',
  onTriggerPriceChange = () => undefined,
  onTriggerPriceFocus,
  onTriggerPriceBlur,
  onTriggerPriceFieldPress,
  priceCardMessage,
  sizeInput,
  sizeSlider,
  sizeCardRef,
  onSizeFieldPress,
  availableBalance,
  onAddFundsPress,
  reduceOnly,
  onReduceOnlyChange,
  twap,
  onTwapDurationPress,
  onTPSLPress,
  notices,
  summary,
  placeOrderLabel,
  placeOrderIntent,
  isPlaceOrderDisabled = false,
  isPlaceOrderLoading = false,
  onPlaceOrderPress,
}: PerpsProOrderFormProps) => {
  const { playSelection } = useHaptics();
  const scaleStartPriceRef = useRef<TextInput>(null);
  const scaleEndPriceRef = useRef<TextInput>(null);
  const scaleTotalOrdersRef = useRef<TextInput>(null);
  const scaleSizeSkewRef = useRef<TextInput>(null);
  const isLong = direction === 'long';
  const isScaleOrder = orderType === 'scale';
  const isScaleFormLocked = isScaleOrder && isPlaceOrderLoading;
  const showsTriggerPrice = isTriggerOrderType(orderType);
  const showsLimitPrice = isLimitExecutionOrderType(orderType);
  const isTwap = orderType === 'twap';
  const showsTpSl =
    !reduceOnly && !showsTriggerPrice && !isTwap && !isScaleOrder;
  const orderTypeTitle = strings(`perps.order.type.${orderType}.title`);
  const summaryOnSlippagePress = summary.onSlippagePress;
  const scaleInputs: readonly ScaleInputConfig[] = [
    {
      inputTestID: ids.SCALE_START_PRICE,
      inputRef: scaleStartPriceRef,
      containerRef: scaleKeyboardScroll?.startPrice.cardRef,
      label: strings('perps.pro_order_form.scale.start_price'),
      value: scaleOrder.startPrice,
      onChangeText: scaleOrder.onStartPriceChange,
      onFocus: scaleKeyboardScroll?.startPrice.onFocus,
      onBlur: () => {
        scaleOrder.onStartPriceBlur();
        scaleKeyboardScroll?.startPrice.onBlur();
      },
      onFieldPress: scaleKeyboardScroll?.startPrice.realign,
      startAccessory: scaleOrder.startPrice ? (
        <Text variant={TextVariant.BodySm}>
          {strings('perps.tpsl.usd_label')}
        </Text>
      ) : undefined,
      placeholder: '',
    },
    {
      inputTestID: ids.SCALE_END_PRICE,
      inputRef: scaleEndPriceRef,
      containerRef: scaleKeyboardScroll?.endPrice.cardRef,
      label: strings('perps.pro_order_form.scale.end_price'),
      value: scaleOrder.endPrice,
      onChangeText: scaleOrder.onEndPriceChange,
      onFocus: scaleKeyboardScroll?.endPrice.onFocus,
      onBlur: () => {
        scaleOrder.onEndPriceBlur();
        scaleKeyboardScroll?.endPrice.onBlur();
      },
      onFieldPress: scaleKeyboardScroll?.endPrice.realign,
      startAccessory: scaleOrder.endPrice ? (
        <Text variant={TextVariant.BodySm}>
          {strings('perps.tpsl.usd_label')}
        </Text>
      ) : undefined,
      placeholder: '',
    },
    {
      inputTestID: ids.SCALE_TOTAL_ORDERS,
      inputRef: scaleTotalOrdersRef,
      containerRef: scaleKeyboardScroll?.totalOrders.cardRef,
      label: strings('perps.pro_order_form.scale.total_orders'),
      value: scaleOrder.totalOrders,
      onChangeText: scaleOrder.onTotalOrdersChange,
      onFocus: scaleKeyboardScroll?.totalOrders.onFocus,
      onBlur: () => {
        scaleOrder.onTotalOrdersBlur();
        scaleKeyboardScroll?.totalOrders.onBlur();
      },
      onFieldPress: scaleKeyboardScroll?.totalOrders.realign,
      placeholder: '',
      keyboardType: 'number-pad',
    },
    {
      inputTestID: ids.SCALE_SIZE_SKEW,
      inputRef: scaleSizeSkewRef,
      containerRef: scaleKeyboardScroll?.sizeSkew.cardRef,
      label: strings('perps.pro_order_form.scale.size_skew'),
      value: scaleOrder.sizeSkew,
      onChangeText: scaleOrder.onSizeSkewChange,
      onFocus: scaleKeyboardScroll?.sizeSkew.onFocus,
      onBlur: () => {
        scaleOrder.onSizeSkewBlur();
        scaleKeyboardScroll?.sizeSkew.onBlur();
      },
      onFieldPress: scaleKeyboardScroll?.sizeSkew.realign,
      endAccessory: (
        <ButtonIcon
          iconName={IconName.Info}
          size={ButtonIconSize.Xs}
          isDisabled={isScaleFormLocked}
          onPress={scaleOrder.onSizeSkewInfoPress}
          testID={ids.SCALE_SKEW_INFO}
          accessibilityLabel={strings('perps.pro_order_form.scale.size_skew')}
          accessibilityHint={strings(
            'perps.pro_order_form.scale.size_skew_hint',
          )}
        />
      ),
    },
  ];

  const handleDirectionChange = useCallback(
    (value: string) => {
      const nextDirection = value as PerpsProOrderDirection;
      if (nextDirection === direction) {
        return;
      }
      playSelection().catch(() => undefined);
      onDirectionChange(nextDirection);
    },
    [direction, onDirectionChange, playSelection],
  );

  const handleMarginModePress = useCallback(() => {
    if (!onMarginModePress) {
      return;
    }
    playSelection().catch(() => undefined);
    onMarginModePress();
  }, [onMarginModePress, playSelection]);

  const handleLeveragePress = useCallback(() => {
    if (!onLeveragePress) {
      return;
    }
    playSelection().catch(() => undefined);
    onLeveragePress();
  }, [onLeveragePress, playSelection]);

  const handleSlippagePress = useCallback(() => {
    if (!summaryOnSlippagePress) {
      return;
    }
    playSelection().catch(() => undefined);
    summaryOnSlippagePress();
  }, [playSelection, summaryOnSlippagePress]);

  const handleOrderTypeButtonPress = useCallback(() => {
    playSelection().catch(() => undefined);
    onOrderTypeButtonPress();
  }, [onOrderTypeButtonPress, playSelection]);

  const handleUseMidPricePress = useCallback(() => {
    if (!onUseMidPricePress) {
      return;
    }
    playSelection().catch(() => undefined);
    onUseMidPricePress();
  }, [onUseMidPricePress, playSelection]);

  const handleReduceOnlyChange = useCallback(
    (value: boolean) => {
      playSelection().catch(() => undefined);
      onReduceOnlyChange(value);
    },
    [onReduceOnlyChange, playSelection],
  );

  const handleExpandOrderBook = useCallback(() => {
    if (!onExpandOrderBook) {
      return;
    }
    playSelection().catch(() => undefined);
    onExpandOrderBook();
  }, [onExpandOrderBook, playSelection]);

  return (
    <>
      <Box twClassName="gap-4" testID={ids.CONTAINER}>
        {/* Screen-edge inset comes from PerpsProMarketLayout's outer padding
            (wraps form + divider + book), not this Box. Summary rows use
            KeyValueRow which ships with px-4 by default — override to px-0 so
            margin/liquidation/slippage/fees align with the form above. */}
        <Box twClassName="gap-4">
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            gap={4}
          >
            <SegmentedControl
              value={direction}
              onChange={handleDirectionChange}
              isFullWidth
              twClassName="flex-1"
              size={ButtonBaseSize.Sm}
              testID={ids.DIRECTION_CONTROL}
            >
              <FilterButton
                value="long"
                disabled={isScaleFormLocked}
                twClassName={isLong ? 'bg-success-muted' : ''}
                testID={ids.DIRECTION_LONG}
              >
                <Text
                  variant={TextVariant.BodySm}
                  fontWeight={FontWeight.Medium}
                  color={
                    isLong
                      ? TextColor.SuccessDefault
                      : TextColor.TextAlternative
                  }
                >
                  {strings('perps.market.long')}
                </Text>
              </FilterButton>
              <FilterButton
                value="short"
                disabled={isScaleFormLocked}
                twClassName={!isLong ? 'bg-error-muted' : ''}
                testID={ids.DIRECTION_SHORT}
              >
                <Text
                  variant={TextVariant.BodySm}
                  fontWeight={FontWeight.Medium}
                  color={
                    isLong ? TextColor.TextAlternative : TextColor.ErrorDefault
                  }
                >
                  {strings('perps.market.short')}
                </Text>
              </FilterButton>
            </SegmentedControl>
            {isOrderBookCollapsed ? (
              <ButtonIcon
                iconName={IconName.Book}
                accessibilityLabel={strings('perps.order_book.expand')}
                size={ButtonIconSize.Md}
                onPress={handleExpandOrderBook}
                testID={PerpsProMarketViewSelectorsIDs.ORDER_BOOK_EXPAND_BUTTON}
              />
            ) : null}
          </Box>
          <Box
            twClassName="flex-row items-center gap-2"
            testID={ids.MARGIN_SETTINGS_ROW}
          >
            <ButtonBase
              size={ButtonBaseSize.Sm}
              onPress={handleMarginModePress}
              isDisabled={isScaleFormLocked || !onMarginModePress}
              twClassName="h-8 rounded-lg bg-muted px-2"
              testID={ids.MARGIN_MODE_BUTTON}
            >
              {marginModeLabel}
            </ButtonBase>
            <ButtonBase
              size={ButtonBaseSize.Sm}
              onPress={handleLeveragePress}
              isDisabled={isScaleFormLocked || !onLeveragePress}
              twClassName="rounded-lg bg-muted px-2"
              testID={ids.LEVERAGE_BUTTON}
            >
              {leverageLabel}
            </ButtonBase>
          </Box>
          <Box
            ref={orderTypeCardRef}
            twClassName="overflow-hidden rounded-xl bg-muted"
            testID={ids.ORDER_TYPE_CARD}
          >
            <ButtonBase
              onPress={handleOrderTypeButtonPress}
              isDisabled={isScaleFormLocked}
              twClassName="h-[54px] w-full bg-transparent px-3"
              contentWrapperProps={{ twClassName: 'w-full justify-between' }}
              textProps={{ variant: TextVariant.BodySm }}
              endIconName={IconName.ArrowDown}
              endIconProps={{
                size: IconSize.Sm,
                testID: `${ids.ORDER_TYPE_BUTTON}-chevron`,
              }}
              testID={ids.ORDER_TYPE_BUTTON}
            >
              {orderTypeTitle}
            </ButtonBase>
            <PriceField
              label={strings('perps.order.trigger_price')}
              value={triggerPrice}
              onChangeText={onTriggerPriceChange}
              onFocus={onTriggerPriceFocus}
              onBlur={onTriggerPriceBlur}
              onFieldPress={onTriggerPriceFieldPress}
              testID={ids.TRIGGER_PRICE_INPUT}
              prefixTestID={ids.TRIGGER_PRICE_PREFIX}
              isHidden={!showsTriggerPrice}
            />
            <PriceField
              label={strings('perps.order.limit_price')}
              value={limitPrice}
              onChangeText={onLimitPriceChange}
              onFocus={onLimitPriceFocus}
              onBlur={onLimitPriceBlur}
              onFieldPress={onLimitPriceFieldPress}
              onUseMidPress={
                showsLimitPrice && onUseMidPricePress
                  ? handleUseMidPricePress
                  : undefined
              }
              testID={ids.LIMIT_PRICE_INPUT}
              prefixTestID={ids.LIMIT_PRICE_PREFIX}
              midButtonTestID={ids.MID_PRICE_BUTTON}
              isHidden={!showsLimitPrice}
            />
            {isTwap ? (
              <PerpsProTwapFields
                twap={twap}
                onDurationPress={onTwapDurationPress}
              />
            ) : null}
            <ScaleFields
              inputs={scaleInputs}
              isDisabled={isScaleFormLocked}
              isHidden={!isScaleOrder}
            />
          </Box>
          {priceCardMessage ? (
            <HelpText
              severity={
                priceCardMessage.severity === 'error'
                  ? HelpTextSeverity.Danger
                  : HelpTextSeverity.Warning
              }
              testID={ids.PRICE_CARD_MESSAGE}
            >
              {priceCardMessage.message}
            </HelpText>
          ) : null}
          <PerpsProSizeInput
            containerRef={sizeCardRef}
            onFieldPress={onSizeFieldPress}
            value={sizeInput.value}
            onChangeText={sizeInput.onChange}
            denomination={sizeInput.denomination}
            canToggleDenomination={sizeInput.canToggleDenomination}
            onFocus={sizeInput.onFocus}
            onBlur={sizeInput.onBlur}
            onToggleDenomination={sizeInput.onToggleDenomination}
            sizeSlider={sizeSlider}
            availableBalance={availableBalance}
            onAddFundsPress={onAddFundsPress}
            isDisabled={isScaleFormLocked}
          />
          <Box
            testID={ids.REDUCE_ONLY_CONTAINER}
            twClassName="h-12 justify-center rounded-xl bg-muted px-3"
          >
            <Checkbox
              label={strings('perps.order.reduce_only')}
              labelProps={{
                variant: TextVariant.BodySm,
                fontWeight: FontWeight.Medium,
                style: { marginLeft: 0, flex: 1 },
              }}
              isSelected={reduceOnly}
              isDisabled={isScaleFormLocked}
              onChange={handleReduceOnlyChange}
              testID={ids.REDUCE_ONLY}
              twClassName="w-full flex-row-reverse justify-between"
            />
          </Box>
          {showsTpSl ? (
            <TPSLRow
              label={strings('perps.pro_order_form.tpsl')}
              onPress={onTPSLPress}
              testID={ids.TPSL}
            />
          ) : null}
          <Notices notices={notices} />
          <ButtonSemantic
            severity={
              placeOrderIntent === 'long'
                ? ButtonSemanticSeverity.Success
                : ButtonSemanticSeverity.Danger
            }
            size={ButtonBaseSize.Lg}
            isFullWidth
            isDisabled={isPlaceOrderDisabled}
            isLoading={isPlaceOrderLoading}
            onPress={onPlaceOrderPress}
            testID={ids.PLACE_ORDER_BUTTON}
          >
            {placeOrderLabel}
          </ButtonSemantic>
          {isScaleOrder ? (
            <ScalePreview model={scaleOrder} summary={summary} />
          ) : null}
        </Box>
        {!isScaleOrder ? (
          <OrderSummary
            {...summary}
            onSlippagePress={
              summaryOnSlippagePress ? handleSlippagePress : undefined
            }
          />
        ) : null}
      </Box>
      <PerpsProInputKeyboardAccessory inputTestID={ids.SIZE_INPUT} />
      <PerpsProInputKeyboardAccessory inputTestID={ids.TRIGGER_PRICE_INPUT} />
      <PerpsProInputKeyboardAccessory inputTestID={ids.LIMIT_PRICE_INPUT} />
      {scaleInputs.map((input, index) => (
        <PerpsProInputKeyboardAccessory
          key={input.inputTestID}
          inputTestID={input.inputTestID}
          onPrevious={
            index > 0
              ? () => scaleInputs[index - 1].inputRef.current?.focus()
              : undefined
          }
          onNext={
            index < scaleInputs.length - 1
              ? () => scaleInputs[index + 1].inputRef.current?.focus()
              : undefined
          }
        />
      ))}
    </>
  );
};

export default PerpsProOrderForm;
