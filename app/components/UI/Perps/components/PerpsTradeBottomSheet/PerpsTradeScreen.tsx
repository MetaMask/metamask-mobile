import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonBaseSize,
  ButtonSemantic,
  ButtonSemanticSeverity,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  SelectButton,
  SelectButtonSize,
  SelectButtonVariant,
  Skeleton,
  Tag,
  TagSeverity,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import type { OrderType } from '@metamask/perps-controller';
import React, { useState } from 'react';
import { Pressable } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import Keypad from '../../../../Base/Keypad';
import { PerpsTradeSheetSelectorsIDs } from '../../Perps.testIds';
import PerpsAmountDisplay from '../PerpsAmountDisplay';
import PerpsOICapWarning from '../PerpsOICapWarning';
import PerpsServiceInterruptionBanner from '../PerpsServiceInterruptionBanner';
import PerpsSlider from '../PerpsSlider';
import PerpsSwapIcon from '../PerpsSwapIcon';
import PerpsTokenLogo from '../PerpsTokenLogo';
import LivePriceHeader from '../LivePriceDisplay/LivePriceHeader';
import {
  formatPerpsFiat,
  PRICE_RANGES_UNIVERSAL,
} from '../../utils/formatUtils';
import {
  PerpsTradeSheetTitleBanner,
  usePerpsTradeSheet,
} from './PerpsTradeBottomSheet';
import { LIMIT_PRICE_CONFIG } from '../../constants/perpsConfig';

interface PerpsTradeScreenProps {
  asset: string;
  oiCapSymbol: string;
  direction: 'long' | 'short';
  leverage: number;
  /** Market maximum, shown as a header tag; `null` while market data loads. */
  maxLeverage: number | null;
  currentPrice: number;
  percentChange24h: number | null;
  orderType: Extract<OrderType, 'market' | 'limit'>;
  limitPrice?: string;
  limitPriceWarning?: string;
  autoCloseText: string;
  showAutoClose: boolean;
  margin: string;
  /** Formatted liquidation price, or a fallback when there is nothing to show. */
  liquidationPrice: string;
  /** Formatted distance from the entry price to liquidation (e.g. `30.05%`). */
  liquidationDistance?: string;
  amount: string;
  tokenAmount?: string;
  sliderMaximum: number;
  isAmountDisabled: boolean;
  isAmountLoading: boolean;
  isHeaderLoading: boolean;
  isPayWithLoading: boolean;
  isMarginLoading: boolean;
  isLiquidationLoading: boolean;
  isFeeLoading: boolean;
  isOrderTypeDisabled: boolean;
  areLimitPricePresetsDisabled: boolean;
  hasAmountError: boolean;
  showAmountWarning: boolean;
  amountWarningMessage?: string;
  isInputFocused: boolean;
  isLimitPriceFocused: boolean;
  payWithName: string;
  payWithBalance: string;
  showPayWith: boolean;
  isPayWithDisabled: boolean;
  feePercentage?: string;
  isSubmitting: boolean;
  isSubmitDisabled: boolean;
  submitLabel?: string;
  errorMessages: readonly PerpsTradeError[];
  isAtOICap: boolean;
  showServiceInterruptionBanner: boolean;
  onAmountPress: () => void;
  onSliderValueChange: (value: number) => void;
  onSliderDragEnd: (value: number) => void;
  onKeypadChange: (value: { value: string; valueAsNumber: number }) => void;
  onPercentagePress: (percentage: number) => void;
  onMaxPress: () => void;
  onDonePress: () => void;
  /** Swaps between market and limit; the sheet offers no other order types. */
  onOrderTypeToggle: () => void;
  onLimitPricePress: () => void;
  onLimitPriceKeypadChange: (value: {
    value: string;
    valueAsNumber: number;
  }) => void;
  onLimitPricePresetPress: (
    preset: 'mid' | 'book' | 'percentage-1' | 'percentage-2',
  ) => void;
  onLimitPriceDonePress: () => void;
  onPayWithPress: () => void;
  onSubmit: () => void;
}

export interface PerpsTradeError {
  key: string;
  message: React.ReactNode;
}

/**
 * Five equal-width buttons share the limit-price preset row. The design
 * system's default `px-4` leaves too little room for labels like "Done" or
 * "Mid" on narrow screens (the label is clipped, not wrapped), so the
 * horizontal padding is tightened.
 */
const LIMIT_PRICE_PRESET_BUTTON_CLASS_NAME = 'flex-1 px-1';

interface ActionRowProps {
  label: string;
  accessibilityLabel: string;
  value: React.ReactNode;
  labelEndAccessory?: React.ReactNode;
  onPress?: () => void;
  testID?: string;
  showInfo?: boolean;
  isDisabled?: boolean;
  showEndIcon?: boolean;
  endIconName?: IconName;
  endIconSize?: IconSize;
  endIconColor?: IconColor;
}

const ActionRow: React.FC<ActionRowProps> = ({
  label,
  accessibilityLabel,
  value,
  labelEndAccessory,
  onPress,
  testID,
  showInfo,
  isDisabled = false,
  showEndIcon = true,
  endIconName = IconName.ArrowRight,
  endIconSize = IconSize.Xs,
  endIconColor = IconColor.IconAlternative,
}) => {
  const content = (
    <Box
      accessible={false}
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Between}
      gap={4}
      twClassName="min-h-10"
    >
      <Box
        accessible={false}
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        gap={1}
      >
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          {label}
        </Text>
        {labelEndAccessory}
        {showInfo ? (
          <Icon
            name={IconName.Info}
            size={IconSize.Sm}
            color={IconColor.IconAlternative}
          />
        ) : null}
      </Box>
      <Box
        accessible={false}
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        gap={1}
      >
        {value}
        {showEndIcon ? (
          <Icon name={endIconName} size={endIconSize} color={endIconColor} />
        ) : null}
      </Box>
    </Box>
  );

  if (!onPress) {
    return (
      <Box
        testID={testID}
        accessible
        accessibilityRole="text"
        accessibilityLabel={accessibilityLabel}
      >
        {content}
      </Box>
    );
  }

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: isDisabled }}
      disabled={isDisabled}
      onPress={onPress}
    >
      {content}
    </Pressable>
  );
};

const PerpsTradeScreen: React.FC<PerpsTradeScreenProps> = ({
  asset,
  oiCapSymbol,
  direction,
  leverage,
  maxLeverage,
  currentPrice,
  percentChange24h,
  orderType,
  limitPrice,
  limitPriceWarning,
  autoCloseText,
  showAutoClose,
  margin,
  liquidationPrice,
  liquidationDistance,
  amount,
  tokenAmount,
  sliderMaximum,
  isAmountDisabled,
  isAmountLoading,
  isHeaderLoading,
  isPayWithLoading,
  isMarginLoading,
  isLiquidationLoading,
  isFeeLoading,
  isOrderTypeDisabled,
  areLimitPricePresetsDisabled,
  hasAmountError,
  showAmountWarning,
  amountWarningMessage,
  isInputFocused,
  isLimitPriceFocused,
  payWithName,
  payWithBalance,
  showPayWith,
  isPayWithDisabled,
  feePercentage,
  isSubmitting,
  isSubmitDisabled,
  submitLabel,
  errorMessages,
  isAtOICap,
  showServiceInterruptionBanner,
  onAmountPress,
  onSliderValueChange,
  onSliderDragEnd,
  onKeypadChange,
  onPercentagePress,
  onMaxPress,
  onDonePress,
  onOrderTypeToggle,
  onLimitPricePress,
  onLimitPriceKeypadChange,
  onLimitPricePresetPress,
  onLimitPriceDonePress,
  onPayWithPress,
  onSubmit,
}) => {
  const { navigateTo, title, banner } = usePerpsTradeSheet();
  const [showAssetValue, setShowAssetValue] = useState(false);
  const directionLabel =
    direction === 'long'
      ? strings('perps.order.button.long', { asset })
      : strings('perps.order.button.short', { asset });
  const payWithLabel = `${payWithName} (${payWithBalance})`;
  const orderTypeLabel =
    orderType === 'market'
      ? strings('perps.order.market')
      : strings('perps.order.limit');
  const isEditing = isInputFocused || isLimitPriceFocused;
  const limitPriceDisplay = limitPrice
    ? isLimitPriceFocused
      ? `$${limitPrice}`
      : formatPerpsFiat(limitPrice, { ranges: PRICE_RANGES_UNIVERSAL })
    : strings('perps.order.set_price');

  return (
    <Box accessible={false}>
      <Box
        accessible={false}
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
        paddingHorizontal={4}
        gap={2}
        twClassName="min-h-16 py-1"
      >
        <Box
          accessible={false}
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          gap={2}
          twClassName="min-w-0 flex-1"
        >
          <PerpsTokenLogo symbol={oiCapSymbol} size={32} />
          <Box accessible={false} twClassName="min-w-0 flex-1">
            <Box
              accessible={false}
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              gap={1}
            >
              <Text variant={TextVariant.HeadingSm} twClassName="shrink">
                {directionLabel}
              </Text>
              {maxLeverage !== null ? (
                <Tag
                  severity={TagSeverity.Neutral}
                  accessible
                  accessibilityLabel={strings(
                    'perps.trade_sheet.max_leverage_accessibility_label',
                    { maxLeverage },
                  )}
                  testID={PerpsTradeSheetSelectorsIDs.MAX_LEVERAGE_TAG}
                >
                  {maxLeverage}x
                </Tag>
              ) : null}
            </Box>
            {isHeaderLoading ? (
              <Skeleton
                testID={PerpsTradeSheetSelectorsIDs.HEADER_SKELETON}
                width={112}
                height={18}
              />
            ) : (
              <LivePriceHeader
                symbol={oiCapSymbol}
                currentPrice={currentPrice}
                percentChange24h={percentChange24h}
                testIDPrice={PerpsTradeSheetSelectorsIDs.HEADER_PRICE}
                testIDChange={PerpsTradeSheetSelectorsIDs.HEADER_CHANGE}
              />
            )}
          </Box>
        </Box>
        <SelectButton
          testID={PerpsTradeSheetSelectorsIDs.ORDER_TYPE_BUTTON}
          variant={SelectButtonVariant.Primary}
          size={SelectButtonSize.Md}
          placeholder={orderTypeLabel}
          value={orderTypeLabel}
          accessibilityLabel={strings(
            'perps.trade_sheet.order_type_accessibility_label',
            { orderType: orderTypeLabel },
          )}
          isDisabled={isOrderTypeDisabled}
          onPress={onOrderTypeToggle}
          hideEndArrow
          endAccessory={<PerpsSwapIcon direction="horizontal" />}
        />
      </Box>

      <PerpsTradeSheetTitleBanner title={title} banner={banner} />

      <Box accessible={false} paddingVertical={3} gap={4}>
        <Box accessible={false} paddingHorizontal={4} gap={4}>
          <PerpsAmountDisplay
            amount={amount}
            tokenAmount={tokenAmount}
            tokenSymbol={asset}
            showTokenAmount={showAssetValue}
            variant="tradeSheet"
            accessibilityLabel={`${strings(
              'perps.trade_sheet.amount_slider_accessibility_label',
            )}, ${amount || '0'}`}
            onPress={onAmountPress}
            onDisplayToggle={() => setShowAssetValue((value) => !value)}
            displayToggleAccessibilityLabel={strings(
              showAssetValue
                ? 'perps.trade_sheet.show_fiat_value'
                : 'perps.trade_sheet.show_asset_value',
            )}
            displayToggleTestID={PerpsTradeSheetSelectorsIDs.AMOUNT_TOGGLE}
            isActive={isInputFocused}
            isLoading={isAmountLoading}
            hasError={hasAmountError}
            showWarning={showAmountWarning}
            warningMessage={amountWarningMessage}
          />
          {isInputFocused ? (
            <Box accessible={false} gap={2}>
              <Box
                accessible={false}
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                gap={2}
              >
                <Button
                  variant={ButtonVariant.Secondary}
                  size={ButtonSize.Md}
                  twClassName="flex-1"
                  onPress={() => onPercentagePress(0.25)}
                >
                  25%
                </Button>
                <Button
                  variant={ButtonVariant.Secondary}
                  size={ButtonSize.Md}
                  twClassName="flex-1"
                  onPress={() => onPercentagePress(0.5)}
                >
                  50%
                </Button>
                <Button
                  variant={ButtonVariant.Secondary}
                  size={ButtonSize.Md}
                  twClassName="flex-1"
                  onPress={onMaxPress}
                >
                  {strings('perps.deposit.max_button')}
                </Button>
                <Button
                  variant={ButtonVariant.Secondary}
                  size={ButtonSize.Md}
                  twClassName="flex-1"
                  onPress={onDonePress}
                >
                  {strings('perps.deposit.done_button')}
                </Button>
              </Box>
              <Keypad
                value={amount}
                onChange={onKeypadChange}
                currency="USD"
                decimals={0}
              />
            </Box>
          ) : (
            <PerpsSlider
              value={Number.parseFloat(amount || '0')}
              onValueChange={onSliderValueChange}
              onDragEnd={onSliderDragEnd}
              minimumValue={0}
              maximumValue={sliderMaximum}
              step={1}
              showPercentageLabels
              disabled={isAmountDisabled}
              variant="compact"
              accessibilityLabel={strings(
                'perps.trade_sheet.amount_slider_accessibility_label',
              )}
            />
          )}
        </Box>

        {!isInputFocused ? (
          <Box accessible={false} paddingHorizontal={4}>
            <ActionRow
              testID={PerpsTradeSheetSelectorsIDs.LEVERAGE_ROW}
              label={strings('perps.order.leverage')}
              accessibilityLabel={`${strings(
                'perps.order.leverage',
              )}, ${leverage}x`}
              value={
                <Text
                  variant={TextVariant.BodyMd}
                  fontWeight={FontWeight.Medium}
                >
                  {leverage}x
                </Text>
              }
              onPress={() => navigateTo('leverage')}
            />
            {orderType === 'limit' ? (
              <>
                <ActionRow
                  testID={PerpsTradeSheetSelectorsIDs.LIMIT_PRICE_ROW}
                  label={strings('perps.order.limit_price')}
                  accessibilityLabel={`${strings(
                    'perps.order.limit_price',
                  )}, ${limitPriceDisplay}`}
                  value={
                    <Text
                      variant={TextVariant.BodyMd}
                      fontWeight={FontWeight.Medium}
                      color={
                        limitPrice ? TextColor.TextDefault : TextColor.TextMuted
                      }
                    >
                      {limitPriceDisplay}
                    </Text>
                  }
                  showEndIcon={false}
                  onPress={onLimitPricePress}
                />
                {limitPriceWarning ? (
                  <Text
                    accessibilityRole="alert"
                    variant={TextVariant.BodySm}
                    color={TextColor.ErrorDefault}
                  >
                    {limitPriceWarning}
                  </Text>
                ) : null}
              </>
            ) : null}
            {!isLimitPriceFocused ? (
              <>
                {showAutoClose ? (
                  <ActionRow
                    testID={PerpsTradeSheetSelectorsIDs.AUTO_CLOSE_ROW}
                    label={strings('perps.auto_close.title')}
                    accessibilityLabel={`${strings(
                      'perps.auto_close.title',
                    )}, ${autoCloseText}`}
                    value={
                      <Text
                        variant={TextVariant.BodyMd}
                        fontWeight={FontWeight.Medium}
                      >
                        {autoCloseText}
                      </Text>
                    }
                    onPress={() => navigateTo('tpsl')}
                  />
                ) : null}
                {showPayWith ? (
                  <ActionRow
                    testID={PerpsTradeSheetSelectorsIDs.PAY_WITH_ROW}
                    label={strings('confirm.label.pay_with')}
                    accessibilityLabel={`${strings(
                      'confirm.label.pay_with',
                    )}, ${payWithLabel}`}
                    value={
                      isPayWithLoading ? (
                        <Skeleton
                          testID={PerpsTradeSheetSelectorsIDs.PAY_WITH_SKELETON}
                          width={152}
                          height={20}
                        />
                      ) : (
                        <Text
                          variant={TextVariant.BodyMd}
                          fontWeight={FontWeight.Medium}
                        >
                          {payWithName}{' '}
                          <Text
                            variant={TextVariant.BodyMd}
                            color={TextColor.TextAlternative}
                          >
                            ({payWithBalance})
                          </Text>
                        </Text>
                      )
                    }
                    isDisabled={isPayWithDisabled}
                    onPress={onPayWithPress}
                  />
                ) : null}
                <ActionRow
                  testID={PerpsTradeSheetSelectorsIDs.MARGIN_ROW}
                  label={strings('perps.order.margin')}
                  accessibilityLabel={`${strings(
                    'perps.order.margin',
                  )}, ${strings('perps.margin_mode.isolated_title')}, ${margin}. ${strings(
                    'perps.trade_sheet.margin_info_accessibility_label',
                  )}`}
                  labelEndAccessory={
                    <>
                      <Tag severity={TagSeverity.Neutral}>
                        {strings('perps.margin_mode.isolated_title')}
                      </Tag>
                      <Icon
                        name={IconName.Info}
                        size={IconSize.Sm}
                        color={IconColor.IconAlternative}
                      />
                    </>
                  }
                  value={
                    isMarginLoading ? (
                      <Skeleton
                        testID={PerpsTradeSheetSelectorsIDs.MARGIN_SKELETON}
                        width={64}
                        height={20}
                      />
                    ) : (
                      <Text
                        variant={TextVariant.BodyMd}
                        fontWeight={FontWeight.Medium}
                      >
                        {margin}
                      </Text>
                    )
                  }
                  showEndIcon={false}
                  onPress={() => navigateTo('marginInfo')}
                />
                <ActionRow
                  testID={PerpsTradeSheetSelectorsIDs.LIQUIDATION_PRICE_ROW}
                  label={strings('perps.order.liquidation_price')}
                  accessibilityLabel={`${strings(
                    'perps.order.liquidation_price',
                  )}, ${liquidationPrice}${
                    liquidationDistance ? `, ${liquidationDistance}` : ''
                  }. ${strings(
                    'perps.trade_sheet.liquidation_price_info_accessibility_label',
                  )}`}
                  showInfo
                  value={
                    isLiquidationLoading ? (
                      <Skeleton
                        testID={
                          PerpsTradeSheetSelectorsIDs.LIQUIDATION_PRICE_SKELETON
                        }
                        width={112}
                        height={20}
                      />
                    ) : (
                      <>
                        <Text
                          variant={TextVariant.BodyMd}
                          fontWeight={FontWeight.Medium}
                        >
                          {liquidationPrice}
                        </Text>
                        {liquidationDistance ? (
                          <>
                            <Icon
                              name={
                                direction === 'long'
                                  ? IconName.TrendDown
                                  : IconName.TrendUp
                              }
                              size={IconSize.Sm}
                              color={IconColor.IconAlternative}
                              testID={
                                PerpsTradeSheetSelectorsIDs.LIQUIDATION_TREND_ICON
                              }
                            />
                            <Text
                              variant={TextVariant.BodyMd}
                              color={TextColor.TextAlternative}
                            >
                              {liquidationDistance}
                            </Text>
                          </>
                        ) : null}
                      </>
                    )
                  }
                  showEndIcon={false}
                  onPress={() => navigateTo('liquidationInfo')}
                />
              </>
            ) : null}
          </Box>
        ) : null}

        {isLimitPriceFocused ? (
          <Box accessible={false} paddingHorizontal={4} gap={3}>
            <Box
              accessible={false}
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              gap={2}
            >
              {(
                [
                  ['mid', strings('perps.order.limit_price_modal.mid_price')],
                  [
                    'book',
                    direction === 'long'
                      ? strings('perps.order.limit_price_modal.bid_price')
                      : strings('perps.order.limit_price_modal.ask_price'),
                  ],
                  ['percentage-1', direction === 'long' ? '-1%' : '+1%'],
                  ['percentage-2', direction === 'long' ? '-2%' : '+2%'],
                ] as const
              ).map(([preset, label]) => (
                <Button
                  key={preset}
                  testID={
                    {
                      mid: PerpsTradeSheetSelectorsIDs.LIMIT_PRICE_PRESET_MID,
                      book: PerpsTradeSheetSelectorsIDs.LIMIT_PRICE_PRESET_BOOK,
                      'percentage-1':
                        PerpsTradeSheetSelectorsIDs.LIMIT_PRICE_PRESET_PERCENTAGE_1,
                      'percentage-2':
                        PerpsTradeSheetSelectorsIDs.LIMIT_PRICE_PRESET_PERCENTAGE_2,
                    }[preset]
                  }
                  variant={ButtonVariant.Secondary}
                  size={ButtonSize.Md}
                  twClassName={LIMIT_PRICE_PRESET_BUTTON_CLASS_NAME}
                  isDisabled={areLimitPricePresetsDisabled}
                  onPress={() => onLimitPricePresetPress(preset)}
                >
                  {label}
                </Button>
              ))}
              <Button
                testID={PerpsTradeSheetSelectorsIDs.KEYPAD_DONE_BUTTON}
                variant={ButtonVariant.Secondary}
                size={ButtonSize.Md}
                twClassName={LIMIT_PRICE_PRESET_BUTTON_CLASS_NAME}
                onPress={onLimitPriceDonePress}
              >
                {strings('perps.deposit.done_button')}
              </Button>
            </Box>
            <Keypad
              value={limitPrice || ''}
              onChange={onLimitPriceKeypadChange}
              currency="USD_PERPS"
              decimals={LIMIT_PRICE_CONFIG.KeypadDecimals}
            />
          </Box>
        ) : null}
      </Box>

      {!isEditing && (isAtOICap || showServiceInterruptionBanner) ? (
        <Box accessible={false} paddingHorizontal={4} paddingBottom={3} gap={2}>
          {isAtOICap ? (
            <PerpsOICapWarning symbol={oiCapSymbol} variant="banner" />
          ) : null}
          {showServiceInterruptionBanner ? (
            <PerpsServiceInterruptionBanner />
          ) : null}
        </Box>
      ) : null}

      {!isEditing && !isAtOICap ? (
        <Box
          accessible={false}
          paddingHorizontal={4}
          paddingTop={2}
          twClassName="border-t border-muted"
        >
          <Box accessible={false} paddingVertical={2} gap={2}>
            {errorMessages.length > 0 ? (
              <Box gap={1} accessibilityLiveRegion="polite">
                {errorMessages.map((error) => (
                  <Text
                    key={error.key}
                    variant={TextVariant.BodySm}
                    color={TextColor.ErrorDefault}
                    accessibilityRole="alert"
                  >
                    {error.message}
                  </Text>
                ))}
              </Box>
            ) : null}
            <ButtonSemantic
              severity={
                direction === 'long'
                  ? ButtonSemanticSeverity.Success
                  : ButtonSemanticSeverity.Danger
              }
              size={ButtonBaseSize.Lg}
              isFullWidth
              isDisabled={isSubmitDisabled}
              isLoading={isSubmitting}
              onPress={onSubmit}
              testID={PerpsTradeSheetSelectorsIDs.PLACE_ORDER_BUTTON}
            >
              {submitLabel ?? directionLabel}
            </ButtonSemantic>
            {isFeeLoading ? (
              <Skeleton
                testID={PerpsTradeSheetSelectorsIDs.FEE_SKELETON}
                width={112}
                height={16}
                twClassName="self-center"
              />
            ) : feePercentage ? (
              <Text
                variant={TextVariant.BodyXs}
                color={TextColor.TextAlternative}
                twClassName="text-center"
              >
                {strings('perps.trade_sheet.includes_fee', { feePercentage })}
              </Text>
            ) : null}
          </Box>
        </Box>
      ) : null}
    </Box>
  );
};

export default PerpsTradeScreen;
