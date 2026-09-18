import {
  BottomSheetFooter,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonBase,
  ButtonBaseSize,
  ButtonSize,
  ButtonVariant,
  FilterButton,
  HeaderStandard,
  HelpText,
  HelpTextSeverity,
  Icon,
  IconColor,
  IconName,
  IconSize,
  SegmentedControl,
  SegmentedControlSize,
  Text,
  TextColor,
  TextField,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { OrderType } from '@metamask/perps-controller';
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { strings } from '../../../../../../locales/i18n';
import { bpsToPercent } from '../../constants/slippageConfig';
import { usePerpsTPSLForm } from '../../hooks/usePerpsTPSLForm';
import { PerpsTradeSheetSelectorsIDs } from '../../Perps.testIds';
import {
  formatPerpsFiat,
  PRICE_RANGES_UNIVERSAL,
} from '../../utils/formatUtils';
import PerpsSlippageBottomSheet from '../PerpsSlippageBottomSheet';
import { usePerpsTradeSheet } from './PerpsTradeBottomSheet';

type TradeSettingsOrderType = Extract<OrderType, 'market' | 'limit'>;

interface PerpsTradeSettingsSaveParams {
  takeProfitPrice?: string;
  stopLossPrice?: string;
  maxSlippageBps: number;
}

interface PerpsTradeSettingsScreenProps {
  asset: string;
  amount: string;
  currentPrice: number;
  direction: 'long' | 'short';
  estimatedSlippageBps: number | null;
  initialTakeProfitPrice?: string;
  initialStopLossPrice?: string;
  leverage: number;
  limitPrice?: string;
  liquidationPrice?: string;
  maxSlippageBps: number;
  orderType: TradeSettingsOrderType;
  szDecimals?: number;
  onOrderTypeChange: (orderType: TradeSettingsOrderType) => void;
  onSlippageEdit?: () => void;
  onSave: (params: PerpsTradeSettingsSaveParams) => void;
}

const RoeSignBadge: React.FC<{
  sign: '+' | '-';
  onPress: () => void;
  testID: string;
  accessibilityLabel: string;
}> = ({ sign, onPress, testID, accessibilityLabel }) => (
  <ButtonBase
    size={ButtonBaseSize.Sm}
    onPress={onPress}
    testID={testID}
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel}
    twClassName="h-6 min-w-6 shrink-0 self-center rounded-md bg-muted px-1"
    textProps={{
      variant: TextVariant.BodyMd,
      color: sign === '+' ? TextColor.SuccessDefault : TextColor.ErrorDefault,
    }}
  >
    {sign}
  </ButtonBase>
);

const PriceRow: React.FC<{ label: string; value: string }> = ({
  label,
  value,
}) => (
  <Box
    accessible={false}
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    justifyContent={BoxJustifyContent.Between}
    paddingVertical={1}
  >
    <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
      {label}
    </Text>
    <Text variant={TextVariant.BodyMd}>{value}</Text>
  </Box>
);

const PerpsTradeSettingsScreen: React.FC<PerpsTradeSettingsScreenProps> = ({
  asset,
  amount,
  currentPrice,
  direction,
  estimatedSlippageBps,
  initialTakeProfitPrice,
  initialStopLossPrice,
  leverage,
  limitPrice,
  liquidationPrice,
  maxSlippageBps,
  orderType,
  szDecimals,
  onOrderTypeChange,
  onSlippageEdit,
  onSave,
}) => {
  const tw = useTailwind();
  const { close, goBack } = usePerpsTradeSheet();
  const [draftSlippageBps, setDraftSlippageBps] = useState(maxSlippageBps);
  const [isSlippageEditorOpen, setIsSlippageEditorOpen] = useState(false);

  const effectiveEntryPrice =
    orderType === 'limit' && limitPrice && Number.parseFloat(limitPrice) > 0
      ? Number.parseFloat(limitPrice)
      : currentPrice;

  const tpslForm = usePerpsTPSLForm({
    asset,
    amount,
    currentPrice,
    direction,
    initialTakeProfitPrice,
    initialStopLossPrice,
    isVisible: true,
    leverage,
    liquidationPrice,
    orderType,
    entryPrice: effectiveEntryPrice,
    szDecimals,
  });

  const {
    takeProfitPrice,
    stopLossPrice,
    takeProfitPercentage,
    stopLossPercentage,
    takeProfitSign,
    stopLossSign,
  } = tpslForm.formState;
  const {
    handleTakeProfitPriceChange,
    handleTakeProfitPercentageChange,
    handleStopLossPriceChange,
    handleStopLossPercentageChange,
    handleTakeProfitPriceFocus,
    handleTakeProfitPriceBlur,
    handleTakeProfitPercentageFocus,
    handleTakeProfitPercentageBlur,
    handleStopLossPriceFocus,
    handleStopLossPriceBlur,
    handleStopLossPercentageFocus,
    handleStopLossPercentageBlur,
  } = tpslForm.handlers;
  const {
    handleTakeProfitOff,
    handleStopLossOff,
    handleTakeProfitSignToggle,
    handleStopLossSignToggle,
  } = tpslForm.buttons;

  const currentPriceDisplay = formatPerpsFiat(currentPrice, {
    ranges: PRICE_RANGES_UNIVERSAL,
  });
  const liquidationPriceDisplay = liquidationPrice
    ? formatPerpsFiat(liquidationPrice, {
        ranges: PRICE_RANGES_UNIVERSAL,
      })
    : '--';
  const slippageDisplay =
    estimatedSlippageBps === null
      ? strings('perps.slippage.row_format_pending', {
          value: bpsToPercent(draftSlippageBps),
        })
      : strings('perps.slippage.row_format', {
          est: bpsToPercent(estimatedSlippageBps).toFixed(1),
          value: bpsToPercent(draftSlippageBps),
        });

  const hasChanges =
    tpslForm.validation.hasChanges || draftSlippageBps !== maxSlippageBps;

  const handleOrderTypeChange = useCallback(
    (value: string) => {
      if (value === 'market' || value === 'limit') {
        onOrderTypeChange(value);
      }
    },
    [onOrderTypeChange],
  );

  const handleOpenSlippage = useCallback(() => {
    onSlippageEdit?.();
    setIsSlippageEditorOpen(true);
  }, [onSlippageEdit]);

  const handleSave = useCallback(() => {
    onSave({
      takeProfitPrice: takeProfitPrice.trim() || undefined,
      stopLossPrice: stopLossPrice.trim() || undefined,
      maxSlippageBps: draftSlippageBps,
    });
    goBack();
  }, [draftSlippageBps, goBack, onSave, stopLossPrice, takeProfitPrice]);

  const saveButtonProps = useMemo(
    () => ({
      children: strings('perps.order.tpsl_modal.save'),
      onPress: handleSave,
      size: ButtonSize.Lg,
      isDisabled: !hasChanges || !tpslForm.validation.isValid,
      testID: PerpsTradeSheetSelectorsIDs.SETTINGS_SAVE_BUTTON,
    }),
    [handleSave, hasChanges, tpslForm.validation.isValid],
  );

  if (isSlippageEditorOpen) {
    return (
      <PerpsSlippageBottomSheet
        isVisible
        currentValueBps={draftSlippageBps}
        presentation="screen"
        onBack={() => setIsSlippageEditorOpen(false)}
        onClose={close}
        onSave={setDraftSlippageBps}
        onSaveComplete={() => setIsSlippageEditorOpen(false)}
      />
    );
  }

  return (
    <Box accessible={false} twClassName="flex-1">
      <HeaderStandard
        title={strings('perps.trade_sheet.settings')}
        onBack={goBack}
        backButtonProps={{
          testID: PerpsTradeSheetSelectorsIDs.SETTINGS_BACK_BUTTON,
          accessibilityLabel: strings('navigation.back'),
        }}
      />
      <ScrollView
        contentContainerStyle={tw.style('grow')}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Box accessible={false} paddingHorizontal={4} paddingTop={3} gap={2}>
          <PriceRow
            label={strings('perps.tpsl.current_price')}
            value={currentPriceDisplay}
          />
          <PriceRow
            label={strings('perps.tpsl.liquidation_price')}
            value={liquidationPriceDisplay}
          />
        </Box>

        <Box accessible={false} twClassName="my-3 h-2 bg-muted" />

        <Box accessible={false} paddingHorizontal={4} gap={3}>
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {strings('perps.order.type.title')}
          </Text>
          <SegmentedControl
            value={orderType}
            onChange={handleOrderTypeChange}
            size={SegmentedControlSize.Md}
            isFullWidth
            testID={PerpsTradeSheetSelectorsIDs.SETTINGS_ORDER_TYPE}
          >
            <FilterButton value="market">
              {strings('perps.order.market')}
            </FilterButton>
            <FilterButton value="limit">
              {strings('perps.order.limit')}
            </FilterButton>
          </SegmentedControl>

          <Box
            accessible={false}
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Between}
            twClassName="mt-1 min-h-8"
          >
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              {strings('perps.order.take_profit')}
            </Text>
            <Button
              variant={ButtonVariant.Tertiary}
              size={ButtonSize.Sm}
              onPress={handleTakeProfitOff}
              accessibilityLabel={`${strings('perps.tpsl.clear')} ${strings(
                'perps.order.take_profit',
              )}`}
              testID={PerpsTradeSheetSelectorsIDs.SETTINGS_TP_CLEAR_BUTTON}
            >
              {strings('perps.tpsl.clear')}
            </Button>
          </Box>
          <Box accessible={false} flexDirection={BoxFlexDirection.Row} gap={2}>
            <TextField
              twClassName="flex-1"
              value={takeProfitPrice}
              onChangeText={handleTakeProfitPriceChange}
              onFocus={handleTakeProfitPriceFocus}
              onBlur={handleTakeProfitPriceBlur}
              isError={Boolean(tpslForm.validation.takeProfitError)}
              startAccessory={
                <Text
                  variant={TextVariant.BodyMd}
                  color={TextColor.TextAlternative}
                >
                  {strings('perps.tpsl.usd_label')}
                </Text>
              }
              inputProps={{
                keyboardType: 'decimal-pad',
                accessibilityLabel: strings('perps.order.take_profit'),
                testID: PerpsTradeSheetSelectorsIDs.SETTINGS_TP_PRICE_INPUT,
              }}
            />
            <TextField
              twClassName="flex-1"
              value={takeProfitPercentage}
              onChangeText={handleTakeProfitPercentageChange}
              onFocus={handleTakeProfitPercentageFocus}
              onBlur={handleTakeProfitPercentageBlur}
              isError={Boolean(tpslForm.validation.takeProfitError)}
              startAccessory={
                <RoeSignBadge
                  sign={takeProfitSign}
                  onPress={handleTakeProfitSignToggle}
                  testID={PerpsTradeSheetSelectorsIDs.SETTINGS_TP_SIGN_BUTTON}
                  accessibilityLabel={strings(
                    'perps.tpsl.toggle_take_profit_sign',
                  )}
                />
              }
              endAccessory={
                <Text
                  variant={TextVariant.BodyMd}
                  color={TextColor.TextAlternative}
                >
                  %
                </Text>
              }
              inputProps={{
                keyboardType: 'decimal-pad',
                accessibilityLabel: `${strings('perps.order.take_profit')} %`,
                testID: PerpsTradeSheetSelectorsIDs.SETTINGS_TP_PERCENT_INPUT,
              }}
            />
          </Box>
          {tpslForm.validation.takeProfitError ? (
            <HelpText severity={HelpTextSeverity.Danger} showIcon>
              {tpslForm.validation.takeProfitError}
            </HelpText>
          ) : null}

          <Box
            accessible={false}
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Between}
            twClassName="mt-1 min-h-8"
          >
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              {strings('perps.order.stop_loss')}
            </Text>
            <Button
              variant={ButtonVariant.Tertiary}
              size={ButtonSize.Sm}
              onPress={handleStopLossOff}
              accessibilityLabel={`${strings('perps.tpsl.clear')} ${strings(
                'perps.order.stop_loss',
              )}`}
              testID={PerpsTradeSheetSelectorsIDs.SETTINGS_SL_CLEAR_BUTTON}
            >
              {strings('perps.tpsl.clear')}
            </Button>
          </Box>
          <Box accessible={false} flexDirection={BoxFlexDirection.Row} gap={2}>
            <TextField
              twClassName="flex-1"
              value={stopLossPrice}
              onChangeText={handleStopLossPriceChange}
              onFocus={handleStopLossPriceFocus}
              onBlur={handleStopLossPriceBlur}
              isError={Boolean(
                tpslForm.validation.stopLossError ||
                  tpslForm.validation.stopLossLiquidationError,
              )}
              startAccessory={
                <Text
                  variant={TextVariant.BodyMd}
                  color={TextColor.TextAlternative}
                >
                  {strings('perps.tpsl.usd_label')}
                </Text>
              }
              inputProps={{
                keyboardType: 'decimal-pad',
                accessibilityLabel: strings('perps.order.stop_loss'),
                testID: PerpsTradeSheetSelectorsIDs.SETTINGS_SL_PRICE_INPUT,
              }}
            />
            <TextField
              twClassName="flex-1"
              value={stopLossPercentage}
              onChangeText={handleStopLossPercentageChange}
              onFocus={handleStopLossPercentageFocus}
              onBlur={handleStopLossPercentageBlur}
              isError={Boolean(
                tpslForm.validation.stopLossError ||
                  tpslForm.validation.stopLossLiquidationError,
              )}
              startAccessory={
                <RoeSignBadge
                  sign={stopLossSign}
                  onPress={handleStopLossSignToggle}
                  testID={PerpsTradeSheetSelectorsIDs.SETTINGS_SL_SIGN_BUTTON}
                  accessibilityLabel={strings(
                    'perps.tpsl.toggle_stop_loss_sign',
                  )}
                />
              }
              endAccessory={
                <Text
                  variant={TextVariant.BodyMd}
                  color={TextColor.TextAlternative}
                >
                  %
                </Text>
              }
              inputProps={{
                keyboardType: 'decimal-pad',
                accessibilityLabel: `${strings('perps.order.stop_loss')} %`,
                testID: PerpsTradeSheetSelectorsIDs.SETTINGS_SL_PERCENT_INPUT,
              }}
            />
          </Box>
          {tpslForm.validation.stopLossError ||
          tpslForm.validation.stopLossLiquidationError ? (
            <HelpText severity={HelpTextSeverity.Danger} showIcon>
              {tpslForm.validation.stopLossError ||
                tpslForm.validation.stopLossLiquidationError}
            </HelpText>
          ) : null}
        </Box>

        <Box accessible={false} twClassName="my-3 h-px bg-muted" />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${strings(
            'perps.slippage.slippage',
          )}, ${slippageDisplay}`}
          onPress={handleOpenSlippage}
          testID={PerpsTradeSheetSelectorsIDs.SETTINGS_SLIPPAGE_ROW}
        >
          <Box
            accessible={false}
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Between}
            paddingHorizontal={4}
            paddingVertical={2}
          >
            <Box
              accessible={false}
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              gap={1}
            >
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
              >
                {strings('perps.slippage.slippage')}
              </Text>
              <Icon
                name={IconName.Info}
                size={IconSize.Sm}
                color={IconColor.IconAlternative}
              />
            </Box>
            <Box
              accessible={false}
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              gap={2}
            >
              <Text variant={TextVariant.BodyMd}>{slippageDisplay}</Text>
              <Icon name={IconName.Edit} size={IconSize.Sm} />
            </Box>
          </Box>
        </Pressable>

        <Box accessible={false} paddingHorizontal={4} paddingVertical={3}>
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {strings('perps.tooltips.tp_sl.content')}
          </Text>
        </Box>
      </ScrollView>
      <BottomSheetFooter primaryButtonProps={saveButtonProps} />
    </Box>
  );
};

export default PerpsTradeSettingsScreen;
