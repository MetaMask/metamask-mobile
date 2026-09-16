import {
  AvatarToken,
  AvatarTokenSize,
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
import {
  PerpsTradeSheetTitleBanner,
  usePerpsTradeSheet,
} from './PerpsTradeBottomSheet';

interface PerpsTradeScreenProps {
  asset: string;
  oiCapSymbol: string;
  assetIconUrl?: string;
  direction: 'long' | 'short';
  leverage: number;
  orderType: Extract<OrderType, 'market' | 'limit'>;
  limitPrice?: string;
  autoCloseText: string;
  margin: string;
  amount: string;
  tokenAmount?: string;
  sliderMaximum: number;
  isAmountDisabled: boolean;
  isAmountLoading: boolean;
  hasAmountError: boolean;
  showAmountWarning: boolean;
  amountWarningMessage?: string;
  isInputFocused: boolean;
  isLimitPriceFocused: boolean;
  payWithName: string;
  payWithBalance: string;
  showPayWith: boolean;
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
  onOrderTypePress: () => void;
  onLimitPricePress: () => void;
  onLimitPriceKeypadChange: (value: {
    value: string;
    valueAsNumber: number;
  }) => void;
  onLimitPricePresetPress: (
    preset: 'mid' | 'book' | 'percentage-1' | 'percentage-2',
  ) => void;
  onLimitPriceDonePress: () => void;
  onAutoClosePress: () => void;
  onPayWithPress: () => void;
  onSubmit: () => void;
}

export interface PerpsTradeError {
  key: string;
  message: React.ReactNode;
}

interface ActionRowProps {
  label: string;
  accessibilityLabel: string;
  value: React.ReactNode;
  labelEndAccessory?: React.ReactNode;
  onPress?: () => void;
  testID?: string;
  showInfo?: boolean;
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
      onPress={onPress}
    >
      {content}
    </Pressable>
  );
};

const PerpsTradeScreen: React.FC<PerpsTradeScreenProps> = ({
  asset,
  oiCapSymbol,
  assetIconUrl,
  direction,
  leverage,
  orderType,
  limitPrice,
  autoCloseText,
  margin,
  amount,
  tokenAmount,
  sliderMaximum,
  isAmountDisabled,
  isAmountLoading,
  hasAmountError,
  showAmountWarning,
  amountWarningMessage,
  isInputFocused,
  isLimitPriceFocused,
  payWithName,
  payWithBalance,
  showPayWith,
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
  onOrderTypePress,
  onLimitPricePress,
  onLimitPriceKeypadChange,
  onLimitPricePresetPress,
  onLimitPriceDonePress,
  onAutoClosePress,
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

  return (
    <Box accessible={false}>
      <Box
        accessible={false}
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
        paddingHorizontal={4}
        paddingVertical={4}
        gap={2}
        twClassName="h-16"
      >
        <Box
          accessible={false}
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          gap={2}
          twClassName="min-w-0 flex-1"
        >
          <AvatarToken
            name={asset}
            src={assetIconUrl ? { uri: assetIconUrl } : undefined}
            size={AvatarTokenSize.Md}
          />
          <Text variant={TextVariant.HeadingSm} twClassName="shrink">
            {directionLabel}
          </Text>
          <Tag severity={TagSeverity.Neutral}>{leverage}x</Tag>
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
          onPress={onOrderTypePress}
          endAccessory={
            <Icon name={IconName.SwapHorizontal} size={IconSize.Xs} />
          }
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
              <ActionRow
                testID={PerpsTradeSheetSelectorsIDs.LIMIT_PRICE_ROW}
                label={strings('perps.order.limit_price')}
                accessibilityLabel={`${strings(
                  'perps.order.limit_price',
                )}, ${limitPrice || '0.00'}`}
                value={
                  <Text
                    variant={TextVariant.BodyMd}
                    fontWeight={FontWeight.Medium}
                    color={
                      limitPrice ? TextColor.TextDefault : TextColor.TextMuted
                    }
                  >
                    ${limitPrice || '0.00'}
                  </Text>
                }
                showEndIcon={false}
                onPress={onLimitPricePress}
              />
            ) : null}
            {!isLimitPriceFocused ? (
              <>
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
                  onPress={onAutoClosePress}
                />
                {showPayWith ? (
                  <ActionRow
                    testID={PerpsTradeSheetSelectorsIDs.PAY_WITH_ROW}
                    label={strings('confirm.label.pay_with')}
                    accessibilityLabel={`${strings(
                      'confirm.label.pay_with',
                    )}, ${payWithLabel}`}
                    value={
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
                    }
                    onPress={onPayWithPress}
                  />
                ) : null}
                <ActionRow
                  testID={PerpsTradeSheetSelectorsIDs.MARGIN_ROW}
                  label={strings('perps.order.margin')}
                  accessibilityLabel={`${strings(
                    'perps.order.margin',
                  )}, ${strings('perps.margin_mode.isolated_title')}, ${margin}`}
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
                    <Text
                      variant={TextVariant.BodyMd}
                      fontWeight={FontWeight.Medium}
                    >
                      {margin}
                    </Text>
                  }
                  showEndIcon={false}
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
                  variant={ButtonVariant.Secondary}
                  size={ButtonSize.Md}
                  twClassName="flex-1"
                  onPress={() => onLimitPricePresetPress(preset)}
                >
                  {label}
                </Button>
              ))}
              <Button
                testID={PerpsTradeSheetSelectorsIDs.KEYPAD_DONE_BUTTON}
                variant={ButtonVariant.Secondary}
                size={ButtonSize.Md}
                twClassName="flex-1"
                onPress={onLimitPriceDonePress}
              >
                {strings('perps.deposit.done_button')}
              </Button>
            </Box>
            <Keypad
              value={limitPrice || ''}
              onChange={onLimitPriceKeypadChange}
              currency="USD_PERPS"
              decimals={5}
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
              twClassName="rounded-xl"
            >
              {submitLabel ?? directionLabel}
            </ButtonSemantic>
            {feePercentage ? (
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
