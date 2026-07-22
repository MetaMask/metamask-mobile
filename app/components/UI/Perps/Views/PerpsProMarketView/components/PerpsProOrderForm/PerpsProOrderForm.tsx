import {
  BannerAlert,
  BannerAlertSeverity,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  ButtonBase,
  ButtonBaseSize,
  ButtonIcon,
  ButtonIconSize,
  ButtonSemantic,
  ButtonSemanticSeverity,
  Checkbox,
  FilterButton,
  Icon,
  IconName,
  IconSize,
  KeyValueRow,
  KeyValueRowVariant,
  SegmentedControl,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import React, { useState } from 'react';
import { InputAccessoryView, Keyboard, Platform, View } from 'react-native';
import { strings } from '../../../../../../../../locales/i18n';
import { PerpsProOrderFormSelectorsIDs } from '../../../../Perps.testIds';
import PerpsFeesDisplay from '../../../../components/PerpsFeesDisplay';
import PerpsSlider from '../../../../components/PerpsSlider';
import PerpsOrderTypeBottomSheetView from '../../../../components/PerpsOrderTypeBottomSheet/PerpsOrderTypeBottomSheetView';
import PerpsProCompactInput, {
  PERPS_PRO_INPUT_ACCESSORY_ID,
} from './PerpsProCompactInput';
import type {
  PerpsProOrderDirection,
  PerpsProOrderFormProps,
  PerpsProOrderNotice,
  PerpsProOrderSummaryProps,
} from './PerpsProOrderForm.types';
interface SelectionRowProps {
  label: string;
  isSelected: boolean;
  onChange: (value: boolean) => void;
  testID: string;
}
const SelectionRow = ({
  label,
  isSelected,
  onChange,
  testID,
}: SelectionRowProps) => (
  <ButtonBase
    size={ButtonBaseSize.Sm}
    twClassName="rounded-xl bg-muted px-3 py-4"
    isFullWidth
    onPress={() => onChange(!isSelected)}
    testID={testID}
    accessibilityState={{ selected: isSelected }}
  >
    <Box
      twClassName="w-full"
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Between}
    >
      <Text variant={TextVariant.BodySm}>{label}</Text>
      <View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Checkbox
          isSelected={isSelected}
          onChange={() => undefined}
          testID={`${testID}-checkbox`}
        />
      </View>
    </Box>
  </ButtonBase>
);
const Notices = ({ notices }: { notices: PerpsProOrderNotice[] }) => (
  <Box twClassName="gap-2">
    {notices.map((notice) =>
      notice.variant === 'banner' ? (
        <BannerAlert
          key={notice.id}
          severity={BannerAlertSeverity.Warning}
          title={notice.title}
          description={notice.message}
          testID={`${PerpsProOrderFormSelectorsIDs.NOTICE}-${notice.id}`}
        />
      ) : (
        <Text
          key={notice.id}
          variant={TextVariant.BodyXs}
          color={TextColor.ErrorDefault}
          testID={`${PerpsProOrderFormSelectorsIDs.NOTICE}-${notice.id}`}
        >
          {notice.message}
        </Text>
      ),
    )}
  </Box>
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
  <Box twClassName="gap-2" testID={PerpsProOrderFormSelectorsIDs.SUMMARY}>
    <KeyValueRow
      variant={KeyValueRowVariant.Summary}
      keyLabel={strings('perps.order.margin')}
      value={margin}
      testID={PerpsProOrderFormSelectorsIDs.SUMMARY_MARGIN}
    />
    <KeyValueRow
      variant={KeyValueRowVariant.Summary}
      keyLabel={strings('perps.order.liquidation_price')}
      value={liquidationPrice}
      testID={PerpsProOrderFormSelectorsIDs.SUMMARY_LIQUIDATION}
    />
    {slippage !== undefined ? (
      <KeyValueRow
        variant={KeyValueRowVariant.Summary}
        keyLabel={strings('perps.slippage.slippage')}
        value={slippage}
        valueEndButtonIconProps={
          onSlippagePress
            ? { iconName: IconName.ArrowRight, onPress: onSlippagePress }
            : undefined
        }
        testID={PerpsProOrderFormSelectorsIDs.SUMMARY_SLIPPAGE}
      />
    ) : null}
    <KeyValueRow
      variant={KeyValueRowVariant.Summary}
      keyLabel={strings('perps.order.fees')}
      value={
        <PerpsFeesDisplay
          fee={fee}
          originalFee={originalFee}
          feeDiscountPercentage={feeDiscountPercentage}
          testID={PerpsProOrderFormSelectorsIDs.SUMMARY_FEES_VALUE}
          variant={TextVariant.BodyXs}
        />
      }
      keyEndButtonIconProps={
        onFeesInfoPress
          ? { iconName: IconName.Info, onPress: onFeesInfoPress }
          : undefined
      }
      testID={PerpsProOrderFormSelectorsIDs.SUMMARY_FEES}
    />
  </Box>
);
const PerpsProOrderForm = ({
  direction,
  onDirectionChange,
  marginModeLabel,
  leverageLabel,
  onLeveragePress,
  orderType,
  onOrderTypeChange,
  limitPrice,
  onLimitPriceChange,
  onUseMidPricePress,
  size,
  onSizeChange,
  onSizeUnitPress,
  balancePercentage,
  onBalancePercentageChange,
  availableBalance,
  onAddFundsPress,
  reduceOnly,
  onReduceOnlyChange,
  isTPSLConfigured,
  onTPSLPress,
  notices,
  summary,
  placeOrderLabel,
  placeOrderIntent,
  isPlaceOrderDisabled = false,
  isPlaceOrderLoading = false,
  onPlaceOrderPress,
}: PerpsProOrderFormProps) => {
  const [isOrderTypeSheetVisible, setIsOrderTypeSheetVisible] = useState(false);
  const handleOrderTypeChange = (nextOrderType: typeof orderType) => {
    onOrderTypeChange(nextOrderType);
    setIsOrderTypeSheetVisible(false);
  };
  return (
    <>
      <Box twClassName="gap-4" testID={PerpsProOrderFormSelectorsIDs.CONTAINER}>
        <SegmentedControl
          value={direction}
          onChange={(value) =>
            onDirectionChange(value as PerpsProOrderDirection)
          }
          isFullWidth
          size={ButtonBaseSize.Sm}
          testID={PerpsProOrderFormSelectorsIDs.DIRECTION_CONTROL}
        >
          <FilterButton
            value="long"
            testID={PerpsProOrderFormSelectorsIDs.DIRECTION_LONG}
          >
            {strings('perps.market.long')}
          </FilterButton>
          <FilterButton
            value="short"
            testID={PerpsProOrderFormSelectorsIDs.DIRECTION_SHORT}
          >
            {strings('perps.market.short')}
          </FilterButton>
        </SegmentedControl>

        <Box flexDirection={BoxFlexDirection.Row} twClassName="gap-2">
          <Box twClassName="flex-1 rounded-lg bg-muted px-3 py-2">
            <Text variant={TextVariant.BodySm}>{marginModeLabel}</Text>
          </Box>
          <ButtonBase
            size={ButtonBaseSize.Sm}
            onPress={onLeveragePress}
            isDisabled={!onLeveragePress}
            twClassName="flex-1 rounded-lg bg-muted"
            testID={PerpsProOrderFormSelectorsIDs.LEVERAGE_BUTTON}
          >
            {leverageLabel}
          </ButtonBase>
        </Box>

        <Box twClassName="rounded-xl bg-muted">
          <ButtonBase
            size={ButtonBaseSize.Sm}
            onPress={() => setIsOrderTypeSheetVisible(true)}
            twClassName="w-full justify-between px-3 py-3"
            testID={PerpsProOrderFormSelectorsIDs.ORDER_TYPE_BUTTON}
          >
            <Box
              twClassName="w-full"
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              justifyContent={BoxJustifyContent.Between}
            >
              <Text variant={TextVariant.BodySm}>
                {orderType === 'market'
                  ? strings('perps.order.type.market.title')
                  : strings('perps.order.type.limit.title')}
              </Text>
              <Icon name={IconName.ArrowDown} size={IconSize.Sm} />
            </Box>
          </ButtonBase>
          {orderType === 'limit' ? (
            <PerpsProCompactInput
              label={strings('perps.order.limit_price')}
              value={limitPrice}
              onChangeText={onLimitPriceChange}
              testID={PerpsProOrderFormSelectorsIDs.LIMIT_PRICE_INPUT}
              endAccessory={
                <ButtonBase
                  size={ButtonBaseSize.Sm}
                  onPress={onUseMidPricePress}
                  isDisabled={!onUseMidPricePress}
                  testID={PerpsProOrderFormSelectorsIDs.MID_PRICE_BUTTON}
                >
                  {strings('perps.order.limit_price_modal.mid_price')}
                </ButtonBase>
              }
            />
          ) : null}
        </Box>

        <PerpsProCompactInput
          label={strings('perps.pro_order_form.size_usd')}
          value={size}
          onChangeText={onSizeChange}
          testID={PerpsProOrderFormSelectorsIDs.SIZE_INPUT}
          endAccessory={
            <ButtonIcon
              iconName={IconName.SwapHorizontal}
              size={ButtonIconSize.Xs}
              onPress={onSizeUnitPress}
              testID={PerpsProOrderFormSelectorsIDs.SIZE_UNIT_BUTTON}
              accessibilityLabel={strings(
                'perps.pro_order_form.toggle_size_unit',
              )}
            />
          }
          footer={
            <PerpsSlider
              value={balancePercentage}
              onValueChange={onBalancePercentageChange}
              minimumValue={0}
              maximumValue={100}
              showPercentageLabels={false}
              showPercentageMarkers
            />
          }
        />

        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="gap-1"
        >
          <Text
            variant={TextVariant.BodyXs}
            color={TextColor.TextAlternative}
            testID={PerpsProOrderFormSelectorsIDs.AVAILABLE_BALANCE}
          >
            {availableBalance}
          </Text>
          <ButtonIcon
            iconName={IconName.Add}
            size={ButtonIconSize.Xs}
            onPress={onAddFundsPress}
            testID={PerpsProOrderFormSelectorsIDs.ADD_FUNDS_BUTTON}
            accessibilityLabel={strings('perps.add_funds')}
          />
        </Box>

        <SelectionRow
          label={strings('perps.order.reduce_only')}
          isSelected={reduceOnly}
          onChange={onReduceOnlyChange}
          testID={PerpsProOrderFormSelectorsIDs.REDUCE_ONLY}
        />
        <SelectionRow
          label={strings('perps.pro_order_form.tpsl')}
          isSelected={isTPSLConfigured}
          onChange={() => onTPSLPress?.()}
          testID={PerpsProOrderFormSelectorsIDs.TPSL}
        />

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
          testID={PerpsProOrderFormSelectorsIDs.PLACE_ORDER_BUTTON}
        >
          {placeOrderLabel}
        </ButtonSemantic>

        <OrderSummary {...summary} />
      </Box>

      {Platform.OS === 'ios' ? (
        <InputAccessoryView nativeID={PERPS_PRO_INPUT_ACCESSORY_ID}>
          <Box
            twClassName="border-t border-muted bg-default px-3 py-2"
            alignItems={BoxAlignItems.End}
          >
            <ButtonIcon
              iconName={IconName.ArrowDown}
              size={ButtonIconSize.Sm}
              onPress={Keyboard.dismiss}
              testID={PerpsProOrderFormSelectorsIDs.KEYBOARD_CLOSE}
              accessibilityLabel={strings(
                'perps.pro_order_form.close_keyboard',
              )}
            />
          </Box>
        </InputAccessoryView>
      ) : null}

      <PerpsOrderTypeBottomSheetView
        isVisible={isOrderTypeSheetVisible}
        onClose={() => setIsOrderTypeSheetVisible(false)}
        onSelect={handleOrderTypeChange}
        currentOrderType={orderType}
        title={strings('perps.pro_order_form.choose_order_type')}
        showSelectedIcon
      />
    </>
  );
};

export default PerpsProOrderForm;
