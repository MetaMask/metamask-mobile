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
import React from 'react';
import { Pressable } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import Keypad from '../../../../Base/Keypad';
import { formatPerpsFiat } from '../../utils/formatUtils';
import PerpsAmountDisplay from '../PerpsAmountDisplay';
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
  maxLeverage: number;
  amount: string;
  tokenAmount?: string;
  sliderMaximum: number;
  isAmountDisabled: boolean;
  isAmountLoading: boolean;
  isInputFocused: boolean;
  liquidationPrice?: string;
  liquidationPercentage?: string;
  payWithLabel: string;
  feePercentage?: string;
  isSubmitting: boolean;
  isSubmitDisabled: boolean;
  onAmountPress: () => void;
  onSliderValueChange: (value: number) => void;
  onSliderDragEnd: (value: number) => void;
  onKeypadChange: (value: { value: string; valueAsNumber: number }) => void;
  onPercentagePress: (percentage: number) => void;
  onMaxPress: () => void;
  onDonePress: () => void;
  onLeverageChange: (value: number) => void;
  onSubmit: () => void;
}

interface ActionRowProps {
  label: string;
  accessibilityLabel: string;
  value: React.ReactNode;
  onPress: () => void;
  showInfo?: boolean;
}

const ActionRow: React.FC<ActionRowProps> = ({
  label,
  accessibilityLabel,
  value,
  onPress,
  showInfo,
}) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel}
    onPress={onPress}
  >
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Between}
      gap={4}
      twClassName="min-h-10"
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
      >
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          {label}
        </Text>
        {showInfo ? (
          <Icon
            name={IconName.Info}
            size={IconSize.Sm}
            color={IconColor.IconAlternative}
            twClassName="ml-1"
          />
        ) : null}
      </Box>
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        gap={1}
      >
        {value}
        <Icon
          name={IconName.ArrowRight}
          size={IconSize.Sm}
          color={IconColor.IconAlternative}
        />
      </Box>
    </Box>
  </Pressable>
);

const PerpsTradeScreen: React.FC<PerpsTradeScreenProps> = ({
  asset,
  assetIconUrl,
  direction,
  leverage,
  maxLeverage,
  amount,
  tokenAmount,
  sliderMaximum,
  isAmountDisabled,
  isAmountLoading,
  isInputFocused,
  liquidationPrice,
  liquidationPercentage,
  payWithLabel,
  feePercentage,
  isSubmitting,
  isSubmitDisabled,
  onAmountPress,
  onSliderValueChange,
  onSliderDragEnd,
  onKeypadChange,
  onPercentagePress,
  onMaxPress,
  onDonePress,
  onLeverageChange,
  onSubmit,
}) => {
  const { close, navigateTo, title, banner } = usePerpsTradeSheet();
  const directionLabel =
    direction === 'long'
      ? strings('perps.order.button.long', { asset })
      : strings('perps.order.button.short', { asset });
  const quickLeverages = [2, 3, 5].filter((value) => value <= maxLeverage);

  return (
    <Box accessible={false}>
      <Box
        accessible={false}
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
        paddingHorizontal={2}
        paddingVertical={3}
      >
        <ButtonIcon
          iconName={IconName.Setting}
          size={ButtonIconSize.Md}
          variant={ButtonIconVariant.Default}
          accessibilityLabel={strings('perps.trade_sheet.settings')}
          onPress={() => navigateTo('settings')}
        />
        <Box
          twClassName={
            direction === 'long'
              ? 'rounded-lg bg-success-muted px-3 py-1'
              : 'rounded-lg bg-error-muted px-3 py-1'
          }
        >
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            gap={1}
          >
            {assetIconUrl ? (
              <AvatarToken
                name={asset}
                src={{ uri: assetIconUrl }}
                size={AvatarTokenSize.Sm}
              />
            ) : null}
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
              size={IconSize.Sm}
              color={IconColor.IconDefault}
            />
          </Box>
        </Box>
        <ButtonIcon
          iconName={IconName.Close}
          size={ButtonIconSize.Md}
          variant={ButtonIconVariant.Default}
          accessibilityLabel={strings('navigation.close')}
          onPress={close}
        />
      </Box>

      <PerpsTradeSheetTitleBanner title={title} banner={banner} />

      <Box paddingHorizontal={4} paddingBottom={3}>
        <PerpsAmountDisplay
          amount={amount}
          tokenAmount={tokenAmount}
          tokenSymbol={asset}
          accessibilityLabel={`${strings(
            'perps.trade_sheet.amount_slider_accessibility_label',
          )}, ${amount || '0'}`}
          onPress={onAmountPress}
          isActive={isInputFocused}
          isLoading={isAmountLoading}
        />
        {isInputFocused ? (
          <Box>
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              gap={2}
              paddingBottom={2}
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
          <>
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

            <Box paddingTop={4}>
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                justifyContent={BoxJustifyContent.Between}
                twClassName="min-h-10"
              >
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.TextAlternative}
                >
                  {strings('perps.order.leverage')}
                </Text>
                <Box
                  flexDirection={BoxFlexDirection.Row}
                  alignItems={BoxAlignItems.Center}
                  gap={2}
                >
                  {quickLeverages.map((value) => (
                    <Button
                      key={value}
                      size={ButtonSize.Sm}
                      variant={
                        leverage === value
                          ? ButtonVariant.Primary
                          : ButtonVariant.Secondary
                      }
                      onPress={() => onLeverageChange(value)}
                    >
                      {value}x
                    </Button>
                  ))}
                  <ButtonIcon
                    iconName={IconName.ArrowRight}
                    size={ButtonIconSize.Sm}
                    variant={ButtonIconVariant.Default}
                    accessibilityLabel={strings('perps.order.leverage')}
                    onPress={() => navigateTo('leverage')}
                  />
                </Box>
              </Box>

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
                    {payWithLabel}
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
                      <Text
                        variant={TextVariant.BodyMd}
                        color={TextColor.TextAlternative}
                      >
                        {liquidationPercentage}
                      </Text>
                    ) : null}
                  </>
                }
                onPress={() => navigateTo('orderSummary')}
                showInfo
              />
            </Box>
          </>
        )}
      </Box>

      {!isInputFocused ? (
        <Box
          paddingHorizontal={4}
          paddingTop={4}
          paddingBottom={4}
          twClassName="border-t border-muted"
        >
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
          >
            {directionLabel}
          </ButtonSemantic>
          {feePercentage ? (
            <Text
              variant={TextVariant.BodyXs}
              color={TextColor.TextAlternative}
              twClassName="mt-2 text-center"
            >
              {strings('perps.trade_sheet.includes_fee', { feePercentage })}
            </Text>
          ) : null}
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
        <Text variant={TextVariant.HeadingSm}>{title}</Text>
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
