import {
  AvatarToken,
  AvatarTokenSize,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonBaseSize,
  ButtonIcon,
  ButtonIconSize,
  ButtonIconVariant,
  ButtonSemantic,
  ButtonSemanticSeverity,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import React, { useState } from 'react';
import { Pressable } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import Keypad from '../../../../Base/Keypad';
import { formatPerpsFiat } from '../../utils/formatUtils';
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
  assetIconUrl?: string;
  direction: 'long' | 'short';
  leverage: number;
  amount: string;
  tokenAmount?: string;
  sliderMaximum: number;
  isAmountDisabled: boolean;
  isAmountLoading: boolean;
  hasAmountError: boolean;
  isInputFocused: boolean;
  liquidationPrice?: string;
  liquidationPercentage?: string;
  payWithName: string;
  payWithBalance: string;
  feePercentage?: string;
  isSubmitting: boolean;
  isSubmitDisabled: boolean;
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
  onPress: () => void;
  showInfo?: boolean;
  endIconName?: IconName;
  endIconSize?: IconSize;
  endIconColor?: IconColor;
}

const ActionRow: React.FC<ActionRowProps> = ({
  label,
  accessibilityLabel,
  value,
  onPress,
  showInfo,
  endIconName = IconName.ArrowRight,
  endIconSize = IconSize.Xs,
  endIconColor = IconColor.IconAlternative,
}) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel}
    onPress={onPress}
  >
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
        <Icon name={endIconName} size={endIconSize} color={endIconColor} />
      </Box>
    </Box>
  </Pressable>
);

const PerpsTradeScreen: React.FC<PerpsTradeScreenProps> = ({
  asset,
  assetIconUrl,
  direction,
  leverage,
  amount,
  tokenAmount,
  sliderMaximum,
  isAmountDisabled,
  isAmountLoading,
  hasAmountError,
  isInputFocused,
  liquidationPrice,
  liquidationPercentage,
  payWithName,
  payWithBalance,
  feePercentage,
  isSubmitting,
  isSubmitDisabled,
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
  onSubmit,
}) => {
  const { navigateTo, title, banner } = usePerpsTradeSheet();
  const [showAssetValue, setShowAssetValue] = useState(false);
  const directionLabel =
    direction === 'long'
      ? strings('perps.order.button.long', { asset })
      : strings('perps.order.button.short', { asset });
  const payWithLabel = `${payWithName} (${payWithBalance})`;

  return (
    <Box accessible={false}>
      <Box
        accessible={false}
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
        paddingHorizontal={2}
        paddingVertical={4}
        gap={2}
        twClassName="h-16"
      >
        <Box
          accessible={false}
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          gap={2}
          paddingHorizontal={2}
          twClassName="flex-1 overflow-hidden"
        >
          <AvatarToken
            name={asset}
            src={assetIconUrl ? { uri: assetIconUrl } : undefined}
            size={AvatarTokenSize.Md}
          />
          <Box
            accessible={false}
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            gap={1}
            twClassName={
              direction === 'long'
                ? 'rounded-lg bg-success-muted px-3 py-1'
                : 'rounded-lg bg-error-muted px-3 py-1'
            }
          >
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Medium}
              color={
                direction === 'long'
                  ? TextColor.SuccessDefault
                  : TextColor.ErrorDefault
              }
            >
              {directionLabel} {leverage}x
            </Text>
            <Icon
              name={IconName.SwapHorizontal}
              size={IconSize.Md}
              color={
                direction === 'long'
                  ? IconColor.SuccessDefault
                  : IconColor.ErrorDefault
              }
            />
          </Box>
        </Box>
        <Box
          accessible={false}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Center}
          twClassName="h-10 w-10"
        >
          <ButtonIcon
            iconName={IconName.Setting}
            size={ButtonIconSize.Md}
            variant={ButtonIconVariant.Default}
            accessibilityLabel={strings('perps.trade_sheet.settings')}
            onPress={() => navigateTo('settings')}
          />
        </Box>
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
            isActive={isInputFocused}
            isLoading={isAmountLoading}
            hasError={hasAmountError}
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
              endIconName={IconName.Edit}
              endIconSize={IconSize.Sm}
              endIconColor={IconColor.IconDefault}
              onPress={() => navigateTo('leverage')}
            />
            <ActionRow
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
              onPress={() => navigateTo('payWith')}
            />
            <ActionRow
              label={strings('perps.order.liquidation_price')}
              accessibilityLabel={`${strings(
                'perps.order.liquidation_price',
              )}, ${liquidationPrice ?? '--'}${
                liquidationPercentage ? `, ${liquidationPercentage}` : ''
              }`}
              value={
                <>
                  <Text
                    variant={TextVariant.BodyMd}
                    fontWeight={FontWeight.Medium}
                  >
                    {liquidationPrice ?? '--'}
                  </Text>
                  {liquidationPercentage ? (
                    <>
                      <Icon
                        name={IconName.TrendDown}
                        size={IconSize.Sm}
                        color={IconColor.IconAlternative}
                      />
                      <Text
                        variant={TextVariant.BodyMd}
                        color={TextColor.TextAlternative}
                      >
                        {liquidationPercentage}
                      </Text>
                    </>
                  ) : null}
                </>
              }
              onPress={() => navigateTo('orderSummary')}
              showInfo
            />
          </Box>
        ) : null}
      </Box>

      {!isInputFocused && (isAtOICap || showServiceInterruptionBanner) ? (
        <Box accessible={false} paddingHorizontal={4} paddingBottom={3} gap={2}>
          {isAtOICap ? (
            <PerpsOICapWarning symbol={asset} variant="banner" />
          ) : null}
          {showServiceInterruptionBanner ? (
            <PerpsServiceInterruptionBanner />
          ) : null}
        </Box>
      ) : null}

      {!isInputFocused ? (
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
              twClassName="rounded-xl"
            >
              {directionLabel}
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

export const PerpsTradePlaceholderScreen: React.FC<{ title: string }> = ({
  title,
}) => {
  const { close, goBack } = usePerpsTradeSheet();
  return (
    <Box accessible={false} twClassName="min-h-[420px]">
      <Box
        accessible={false}
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
        padding={2}
      >
        <ButtonIcon
          iconName={IconName.ArrowLeft}
          size={ButtonIconSize.Md}
          variant={ButtonIconVariant.Default}
          accessibilityLabel={strings('navigation.back')}
          onPress={goBack}
        />
        <Text variant={TextVariant.HeadingSm} accessibilityRole="header">
          {title}
        </Text>
        <ButtonIcon
          iconName={IconName.Close}
          size={ButtonIconSize.Md}
          variant={ButtonIconVariant.Default}
          accessibilityLabel={strings('navigation.close')}
          onPress={close}
        />
      </Box>
    </Box>
  );
};

export default PerpsTradeScreen;
