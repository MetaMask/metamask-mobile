import {
  BannerAlert,
  BannerAlertSeverity,
  Box,
  BoxAlignItems,
  ButtonBase,
  ButtonBaseSize,
  ButtonIcon,
  ButtonIconSize,
  ButtonSemantic,
  ButtonSemanticSeverity,
  FilterButton,
  FontWeight,
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
import React from 'react';
import {
  InputAccessoryView,
  Keyboard,
  Platform,
  Pressable,
} from 'react-native';
import { strings } from '../../../../../../../../locales/i18n';
import { PerpsProOrderFormSelectorsIDs } from '../../../../Perps.testIds';
import PerpsFeesDisplay from '../../../../components/PerpsFeesDisplay';
import PerpsSlider from '../../../../components/PerpsSlider';
import PerpsProCompactInput, {
  PERPS_PRO_INPUT_ACCESSORY_ID,
} from './PerpsProCompactInput';
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
interface SelectionIndicatorProps {
  isSelected: boolean;
  testID: string;
}
const SelectionIndicator = ({ isSelected, testID }: SelectionIndicatorProps) =>
  isSelected ? (
    <Box
      twClassName="size-5 items-center justify-center rounded-full bg-icon-default"
      testID={`${testID}-indicator`}
    >
      <Icon
        name={IconName.CheckBold}
        size={IconSize.Xs}
        color={IconColor.PrimaryInverse}
      />
    </Box>
  ) : (
    <Box
      twClassName="size-5 rounded-full border-2 border-muted"
      testID={`${testID}-indicator`}
    />
  );

interface ReduceOnlyRowProps extends SelectionIndicatorProps {
  label: string;
  onChange: (value: boolean) => void;
}
const ReduceOnlyRow = ({
  label,
  isSelected,
  onChange,
  testID,
}: ReduceOnlyRowProps) => (
  <Pressable
    accessibilityRole="checkbox"
    accessibilityState={{ checked: isSelected }}
    accessibilityLabel={label}
    onPress={() => onChange(!isSelected)}
    testID={testID}
  >
    <Box twClassName="h-12 flex-row items-center justify-between rounded-xl bg-muted px-3">
      <Text variant={TextVariant.BodySm} fontWeight={FontWeight.Medium}>
        {label}
      </Text>
      <SelectionIndicator isSelected={isSelected} testID={testID} />
    </Box>
  </Pressable>
);

interface TPSLRowProps extends SelectionIndicatorProps {
  label: string;
  onPress?: () => void;
}
const TPSLRow = ({ label, isSelected, onPress, testID }: TPSLRowProps) => {
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
        <SelectionIndicator isSelected={isSelected} testID={testID} />
      </Box>
    </Pressable>
  );
};
const Notices = ({ notices }: { notices: PerpsProOrderNotice[] }) =>
  notices.length > 0 ? (
    <Box twClassName="gap-2">
      {notices.map((notice) =>
        notice.variant === 'banner' ? (
          <BannerAlert
            key={notice.id}
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
  <Box twClassName="gap-1" testID={ids.SUMMARY}>
    <KeyValueRow
      keyLabel={strings('perps.order.margin')}
      value={margin}
      keyTextProps={summaryKeyTextProps}
      valueTextProps={summaryValueTextProps}
      twClassName="h-5"
      testID={ids.SUMMARY_MARGIN}
    />
    <KeyValueRow
      keyLabel={strings('perps.pro_order_form.est_liquidation')}
      value={liquidationPrice}
      keyTextProps={summaryKeyTextProps}
      valueTextProps={summaryValueTextProps}
      twClassName="h-5"
      testID={ids.SUMMARY_LIQUIDATION}
    />
    {slippage !== undefined ? (
      <KeyValueRow
        keyLabel={strings('perps.slippage.slippage')}
        value={slippage}
        valueEndButtonIconProps={buttonIcon(
          IconName.Edit,
          ids.SUMMARY_SLIPPAGE_BUTTON,
          onSlippagePress,
        )}
        keyTextProps={summaryKeyTextProps}
        valueTextProps={summaryValueTextProps}
        twClassName="h-5"
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
        />
      }
      keyEndButtonIconProps={buttonIcon(
        IconName.Info,
        ids.SUMMARY_FEES_BUTTON,
        onFeesInfoPress,
      )}
      keyTextProps={summaryKeyTextProps}
      valueTextProps={summaryValueTextProps}
      twClassName="h-5"
      testID={ids.SUMMARY_FEES}
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
  onOrderTypeButtonPress,
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
  const isLong = direction === 'long';
  return (
    <>
      <Box twClassName="gap-4" testID={ids.CONTAINER}>
        <SegmentedControl
          value={direction}
          onChange={(value) =>
            onDirectionChange(value as PerpsProOrderDirection)
          }
          isFullWidth
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
                isLong ? TextColor.SuccessDefault : TextColor.TextAlternative
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
        <Box twClassName="flex-row items-center justify-between">
          <Box twClassName="h-8 justify-center rounded-lg bg-muted px-2">
            <Text variant={TextVariant.BodySm} fontWeight={FontWeight.Medium}>
              {marginModeLabel}
            </Text>
          </Box>
          <ButtonBase
            size={ButtonBaseSize.Sm}
            onPress={onLeveragePress}
            isDisabled={!onLeveragePress}
            twClassName="rounded-lg bg-muted px-2"
            testID={ids.LEVERAGE_BUTTON}
          >
            {leverageLabel}
          </ButtonBase>
        </Box>
        <Box twClassName="overflow-hidden rounded-xl bg-muted">
          <ButtonBase
            onPress={onOrderTypeButtonPress}
            twClassName="h-12 w-full bg-transparent px-3"
            contentWrapperProps={{ twClassName: 'w-full justify-between' }}
            textProps={{ variant: TextVariant.BodySm }}
            endIconName={IconName.ArrowRight}
            endIconProps={{
              size: IconSize.Sm,
              testID: `${ids.ORDER_TYPE_BUTTON}-chevron`,
            }}
            testID={ids.ORDER_TYPE_BUTTON}
          >
            {orderType === 'market'
              ? strings('perps.order.type.market.title')
              : strings('perps.order.type.limit.title')}
          </ButtonBase>
          {orderType === 'limit' ? (
            <PerpsProCompactInput
              label={strings('perps.order.limit_price_modal.title')}
              value={limitPrice}
              onChangeText={onLimitPriceChange}
              testID={ids.LIMIT_PRICE_INPUT}
              variant="inline"
              placeholder={strings('perps.order.limit_price_modal.title')}
              endAccessory={
                <ButtonBase
                  size={ButtonBaseSize.Sm}
                  onPress={onUseMidPricePress}
                  isDisabled={!onUseMidPricePress}
                  twClassName="h-12 bg-transparent px-0"
                  testID={ids.MID_PRICE_BUTTON}
                >
                  {strings('perps.order.limit_price_modal.mid_price')}
                </ButtonBase>
              }
            />
          ) : null}
        </Box>
        <Box twClassName="gap-2">
          <PerpsProCompactInput
            label={strings('perps.pro_order_form.size_usd')}
            value={size}
            onChangeText={onSizeChange}
            testID={ids.SIZE_INPUT}
            placeholder="0.00"
            placeholderColor="default"
            endAccessory={
              <ButtonIcon
                iconName={IconName.SwapHorizontal}
                size={ButtonIconSize.Xs}
                isDisabled={!onSizeUnitPress}
                onPress={onSizeUnitPress}
                testID={ids.SIZE_UNIT_BUTTON}
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
                variant="compact"
                testID={ids.SIZE_SLIDER}
                accessibilityLabel={strings(
                  'perps.pro_order_form.size_percentage',
                )}
              />
            }
          />
          <Box twClassName="flex-row items-center gap-1">
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
              testID={ids.AVAILABLE_BALANCE}
            >
              {availableBalance}
            </Text>
            <ButtonIcon
              iconName={IconName.AddCircle}
              size={ButtonIconSize.Xs}
              iconProps={{ color: IconColor.IconAlternative }}
              isDisabled={!onAddFundsPress}
              onPress={onAddFundsPress}
              testID={ids.ADD_FUNDS_BUTTON}
              accessibilityLabel={strings('perps.add_funds')}
            />
          </Box>
        </Box>
        <ReduceOnlyRow
          label={strings('perps.order.reduce_only')}
          isSelected={reduceOnly}
          onChange={onReduceOnlyChange}
          testID={ids.REDUCE_ONLY}
        />
        <TPSLRow
          label={strings('perps.pro_order_form.tpsl')}
          isSelected={isTPSLConfigured}
          onPress={onTPSLPress}
          testID={ids.TPSL}
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
          testID={ids.PLACE_ORDER_BUTTON}
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
              testID={ids.KEYBOARD_CLOSE}
              accessibilityLabel={strings(
                'perps.pro_order_form.close_keyboard',
              )}
            />
          </Box>
        </InputAccessoryView>
      ) : null}
    </>
  );
};

export default PerpsProOrderForm;
