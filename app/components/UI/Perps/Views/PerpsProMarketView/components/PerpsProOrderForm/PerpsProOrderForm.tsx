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
  isLimitExecutionOrderType,
  isTriggerOrderType,
} from '@metamask/perps-controller';
import React, { useCallback } from 'react';
import {
  InputAccessoryView,
  Keyboard,
  Platform,
  Pressable,
} from 'react-native';
import { strings } from '../../../../../../../../locales/i18n';
import { ImpactMoment, useHaptics } from '../../../../../../../util/haptics';
import {
  PerpsProMarketViewSelectorsIDs,
  PerpsProOrderFormSelectorsIDs,
} from '../../../../Perps.testIds';
import PerpsFeesDisplay from '../../../../components/PerpsFeesDisplay';
import PerpsProCompactInput, {
  getPerpsProInputAccessoryID,
} from './PerpsProCompactInput';
import PerpsProSizeInput from './PerpsProSizeInput';
import type {
  PerpsProOrderDirection,
  PerpsProOrderFormProps,
  PerpsProOrderNotice,
  PerpsProOrderSummaryProps,
} from './PerpsProOrderForm.types';

const ids = PerpsProOrderFormSelectorsIDs;

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

const KeyboardAccessory = ({ inputTestID }: { inputTestID: string }) => (
  <InputAccessoryView nativeID={getPerpsProInputAccessoryID(inputTestID)}>
    <Box
      twClassName="border-t border-muted bg-default px-3 py-2"
      alignItems={BoxAlignItems.End}
    >
      <ButtonIcon
        iconName={IconName.ArrowDown}
        size={ButtonIconSize.Sm}
        onPress={Keyboard.dismiss}
        testID={`${ids.KEYBOARD_CLOSE}-${inputTestID}`}
        accessibilityLabel={strings('perps.pro_order_form.close_keyboard')}
      />
    </Box>
  </InputAccessoryView>
);

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
const summaryFeesRowClassName = 'min-h-6 h-auto px-0';
const summaryRowStyle = { paddingHorizontal: 0 } as const;

interface SlippageValueProps {
  value: string;
  onPress?: () => void;
}

const SlippageValue = ({ value, onPress }: SlippageValueProps) => (
  <Pressable
    accessibilityRole="button"
    accessibilityState={{ disabled: !onPress }}
    disabled={!onPress}
    onPress={onPress}
    testID={ids.SUMMARY_SLIPPAGE_BUTTON}
  >
    <Box twClassName="min-w-0 flex-1 flex-row items-center justify-end gap-1">
      <Text
        variant={TextVariant.BodyXs}
        fontWeight={FontWeight.Medium}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {value}
      </Text>
      <Icon
        name={IconName.Edit}
        size={IconSize.Sm}
        color={IconColor.IconDefault}
      />
    </Box>
  </Pressable>
);

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
        value={<SlippageValue value={slippage} onPress={onSlippagePress} />}
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
  onTPSLPress,
  notices,
  summary,
  placeOrderLabel,
  placeOrderIntent,
  isPlaceOrderDisabled = false,
  isPlaceOrderLoading = false,
  onPlaceOrderPress,
}: PerpsProOrderFormProps) => {
  const { playImpact, playSelection } = useHaptics();
  const isLong = direction === 'long';
  const showsTriggerPrice = isTriggerOrderType(orderType);
  const showsLimitPrice = isLimitExecutionOrderType(orderType);
  const showsTpSl = !reduceOnly && !showsTriggerPrice;
  const orderTypeTitle = strings(`perps.order.type.${orderType}.title`);
  const summaryOnSlippagePress = summary.onSlippagePress;

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
    playImpact(ImpactMoment.PageNavigation).catch(() => undefined);
    onExpandOrderBook();
  }, [onExpandOrderBook, playImpact]);

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
              isDisabled={!onMarginModePress}
              twClassName="h-8 rounded-lg bg-muted px-2"
              testID={ids.MARGIN_MODE_BUTTON}
            >
              {marginModeLabel}
            </ButtonBase>
            <ButtonBase
              size={ButtonBaseSize.Sm}
              onPress={handleLeveragePress}
              isDisabled={!onLeveragePress}
              twClassName="rounded-lg bg-muted px-2"
              testID={ids.LEVERAGE_BUTTON}
            >
              {leverageLabel}
            </ButtonBase>
          </Box>
          <Box
            ref={orderTypeCardRef}
            twClassName="overflow-hidden rounded-xl border border-muted bg-muted"
          >
            <ButtonBase
              onPress={handleOrderTypeButtonPress}
              twClassName="h-12 w-full bg-transparent px-3"
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
              onUseMidPress={showsLimitPrice ? onUseMidPricePress : undefined}
              testID={ids.LIMIT_PRICE_INPUT}
              prefixTestID={ids.LIMIT_PRICE_PREFIX}
              midButtonTestID={ids.MID_PRICE_BUTTON}
              isHidden={!showsLimitPrice}
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
          />
          <Box twClassName="h-12 justify-center rounded-xl bg-muted px-3">
            <Checkbox
              label={strings('perps.order.reduce_only')}
              labelProps={{
                variant: TextVariant.BodySm,
                fontWeight: FontWeight.Medium,
                style: { marginLeft: 0, flex: 1 },
              }}
              isSelected={reduceOnly}
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
        </Box>
        <OrderSummary
          {...summary}
          onSlippagePress={
            summaryOnSlippagePress ? handleSlippagePress : undefined
          }
        />
      </Box>
      {Platform.OS === 'ios' ? (
        <>
          <KeyboardAccessory inputTestID={ids.SIZE_INPUT} />
          <KeyboardAccessory inputTestID={ids.TRIGGER_PRICE_INPUT} />
          <KeyboardAccessory inputTestID={ids.LIMIT_PRICE_INPUT} />
        </>
      ) : null}
    </>
  );
};

export default PerpsProOrderForm;
