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
import { PerpsTradeSheetSelectorsIDs } from '../../Perps.testIds';
import { formatPerpsFiat } from '../../utils/formatUtils';
import PerpsAmountDisplay from '../PerpsAmountDisplay';
import PerpsDirectionButton from '../PerpsDirectionButton';
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
  amount: string;
  tokenAmount?: string;
  sliderMaximum: number;
  isAmountDisabled: boolean;
  isAmountLoading: boolean;
  hasAmountError: boolean;
  showAmountWarning: boolean;
  amountWarningMessage?: string;
  isInputFocused: boolean;
  liquidationPrice?: string;
  liquidationPercentage?: string;
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
    return <Box testID={testID}>{content}</Box>;
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
  amount,
  tokenAmount,
  sliderMaximum,
  isAmountDisabled,
  isAmountLoading,
  hasAmountError,
  showAmountWarning,
  amountWarningMessage,
  isInputFocused,
  liquidationPrice,
  liquidationPercentage,
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
  onSubmit,
}) => {
  const { close, navigateTo, title, banner } = usePerpsTradeSheet();
  const [showAssetValue, setShowAssetValue] = useState(false);
  const directionLabel =
    direction === 'long'
      ? strings('perps.order.button.long', { asset })
      : strings('perps.order.button.short', { asset });

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
          paddingHorizontal={2}
          twClassName="w-20"
        >
          <AvatarToken
            name={asset}
            src={assetIconUrl ? { uri: assetIconUrl } : undefined}
            size={AvatarTokenSize.Md}
          />
        </Box>
        <Box
          accessible={false}
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Center}
          twClassName="flex-1"
        >
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
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Center}
          gap={1}
          twClassName="w-20"
        >
          <ButtonIcon
            iconName={IconName.Setting}
            size={ButtonIconSize.Md}
            variant={ButtonIconVariant.Default}
            accessibilityLabel={strings('perps.trade_sheet.settings')}
            testID={PerpsTradeSheetSelectorsIDs.SETTINGS_BUTTON}
            onPress={() => navigateTo('settings')}
          />
          <ButtonIcon
            iconName={IconName.Close}
            size={ButtonIconSize.Md}
            variant={ButtonIconVariant.Default}
            accessibilityLabel={strings('navigation.close')}
            testID={PerpsTradeSheetSelectorsIDs.CLOSE_BUTTON}
            onPress={close}
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
              endIconName={IconName.Edit}
              endIconSize={IconSize.Sm}
              endIconColor={IconColor.IconDefault}
              onPress={() => navigateTo('leverage')}
            />
            <ActionRow
              testID={PerpsTradeSheetSelectorsIDs.LIQUIDATION_ROW}
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
                        name={
                          direction === 'long'
                            ? IconName.TrendDown
                            : IconName.TrendUp
                        }
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
              showInfo
              showEndIcon={false}
            />
          </Box>
        ) : null}
      </Box>

      {!isInputFocused && (isAtOICap || showServiceInterruptionBanner) ? (
        <Box accessible={false} paddingHorizontal={4} paddingBottom={3} gap={2}>
          {isAtOICap ? (
            <PerpsOICapWarning symbol={oiCapSymbol} variant="banner" />
          ) : null}
          {showServiceInterruptionBanner ? (
            <PerpsServiceInterruptionBanner />
          ) : null}
        </Box>
      ) : null}

      {!isInputFocused && !isAtOICap ? (
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
            <PerpsDirectionButton
              direction={direction}
              size={ButtonBaseSize.Lg}
              isFullWidth
              isDisabled={isSubmitDisabled}
              isLoading={isSubmitting}
              onPress={onSubmit}
              testID={PerpsTradeSheetSelectorsIDs.PLACE_ORDER_BUTTON}
              twClassName="rounded-xl"
            >
              {submitLabel ?? directionLabel}
            </PerpsDirectionButton>
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
