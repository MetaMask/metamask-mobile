import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { ActivityIndicator, TouchableOpacity, View } from 'react-native';
import {
  BottomSheet,
  BottomSheetFooter,
  type BottomSheetRef,
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  FilterButton,
  FontWeight,
  HelpText,
  HelpTextSeverity,
  IconName,
  KeyValueRow,
  KeyValueRowVariant,
  SectionDivider,
  SegmentedControl,
  SegmentedControlSize,
  Slider,
  Text,
  TextColor,
  TextField,
  TextVariant,
} from '@metamask/design-system-react-native';
import {
  getPerpsDisplaySymbol,
  type OrdinaryOrderType,
} from '@metamask/perps-controller';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { useTheme } from '../../../../../util/theme';
import Keypad from '../../../../Base/Keypad';
import { PerpsClosePositionBottomSheetSelectorsIDs } from '../../Perps.testIds';
import PerpsTokenLogo from '../../components/PerpsTokenLogo';
import PerpsAmountDisplay from '../../components/PerpsAmountDisplay';
import PerpsFeesDisplay from '../../components/PerpsFeesDisplay';
import { usePerpsClosePositionForm } from '../../hooks/usePerpsClosePositionForm';
import { usePerpsLimitPriceInput } from './usePerpsLimitPriceInput';
import {
  formatPerpsFiat,
  formatPositionSize,
  PRICE_RANGES_MINIMAL_VIEW,
} from '../../utils/formatUtils';

const PerpsClosePositionBottomSheet: React.FC = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const theme = useTheme();
  const sheetRef = useRef<BottomSheetRef>(null);

  const dismiss = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  const {
    position,
    livePosition,
    isLong,
    currentPrice,
    szDecimals,
    isClosePositionLimitOrderEnabled,
    effectiveOrderType,
    selectOrderType,
    limitPrice,
    setLimitPrice,
    displayClosePercentage,
    liveCloseAmount,
    closeAmountUSDString,
    displayUSDString,
    isInputFocused,
    handleSliderValueChange,
    handleSliderDragEnd,
    handleSliderDragCancel,
    handleSliderGrip,
    handleSliderMark,
    handleAmountPress,
    handleKeypadChange,
    handlePercentagePress,
    handleMaxPress,
    handleDonePress,
    handleConfirm,
    feeResults,
    rewardsState,
    summaryMargin,
    summaryPnl,
    receiveAmount,
    filteredErrors,
    isClosing,
    isConfirmDisabled,
  } = usePerpsClosePositionForm({ dismiss });

  const [isEditingLimitPrice, setIsEditingLimitPrice] = useState(false);

  const limitPriceInput = usePerpsLimitPriceInput({
    asset: position.symbol,
    currentPrice,
    // Closing a long is a sell, so the presets mirror the opposite direction.
    direction: isLong ? 'short' : 'long',
    limitPrice,
    setLimitPrice,
  });

  const handleLimitPriceDone = useCallback(() => {
    limitPriceInput.trackInputMethod();
    setIsEditingLimitPrice(false);
  }, [limitPriceInput]);

  const handleOrderTypeChange = useCallback(
    (value: string) => {
      const nextOrderType = value as OrdinaryOrderType;
      if (nextOrderType === 'market') {
        limitPriceInput.trackInputMethod();
      }
      selectOrderType(nextOrderType);
      setIsEditingLimitPrice(nextOrderType === 'limit');
    },
    [limitPriceInput, selectOrderType],
  );

  const handleFeesTooltipPress = useCallback(() => {
    navigation.navigate(Routes.PERPS.MODALS.CLOSE_POSITION_MODALS, {
      screen: Routes.PERPS.MODALS.TOOLTIP,
      params: {
        contentKey: 'closing_fees',
        data: {
          metamaskFeeRate: feeResults.metamaskFeeRate,
          protocolFeeRate: feeResults.protocolFeeRate,
          originalMetamaskFeeRate: feeResults.originalMetamaskFeeRate,
          feeDiscountPercentage: rewardsState.feeDiscountPercentage,
        },
      },
    });
  }, [
    navigation,
    feeResults.metamaskFeeRate,
    feeResults.protocolFeeRate,
    feeResults.originalMetamaskFeeRate,
    rewardsState.feeDiscountPercentage,
  ]);

  const handleTotalTooltipPress = useCallback(() => {
    navigation.navigate(Routes.PERPS.MODALS.CLOSE_POSITION_MODALS, {
      screen: Routes.PERPS.MODALS.TOOLTIP,
      params: { contentKey: 'close_position_you_receive' },
    });
  }, [navigation]);

  const leverage = livePosition.leverage?.value;
  const tokenAmountLabel = `${formatPositionSize(liveCloseAmount, szDecimals)} ${getPerpsDisplaySymbol(position.symbol)}`;

  const feesValue = feeResults.isLoadingMetamaskFee ? (
    <ActivityIndicator size="small" color={theme.colors.icon.alternative} />
  ) : (
    <PerpsFeesDisplay
      feeDiscountPercentage={rewardsState.feeDiscountPercentage}
      fee={feeResults.totalFee}
      originalFee={feeResults.undiscountedTotalFee}
      testID={PerpsClosePositionBottomSheetSelectorsIDs.FEES_VALUE}
      variant={TextVariant.BodyMd}
    />
  );

  const confirmButtonProps = useMemo(
    () => ({
      children: isClosing
        ? strings('perps.close_position.closing')
        : strings('perps.close_position.button'),
      onPress: handleConfirm,
      size: ButtonSize.Lg,
      isDisabled: isConfirmDisabled,
      isLoading: isClosing,
      testID: PerpsClosePositionBottomSheetSelectorsIDs.CONFIRM_BUTTON,
    }),
    [handleConfirm, isClosing, isConfirmDisabled],
  );

  const isKeypadVisible = isInputFocused || isEditingLimitPrice;

  return (
    <BottomSheet
      ref={sheetRef}
      goBack={navigation.goBack}
      testID={PerpsClosePositionBottomSheetSelectorsIDs.CONTAINER}
    >
      <Box twClassName="flex-row items-center gap-3 px-4 pb-4">
        <PerpsTokenLogo symbol={position.symbol} size={32} />
        <Text
          variant={TextVariant.HeadingMd}
          testID={PerpsClosePositionBottomSheetSelectorsIDs.HEADER_TITLE}
        >
          {`${strings('perps.close_position.close')} `}
          <Text
            variant={TextVariant.HeadingMd}
            color={isLong ? TextColor.SuccessDefault : TextColor.ErrorDefault}
          >
            {strings('perps.close_position.sheet_position_summary', {
              direction: isLong
                ? strings('perps.market.long')
                : strings('perps.market.short'),
              asset: getPerpsDisplaySymbol(position.symbol),
              leverage: leverage ?? '',
            })}
          </Text>
        </Text>
      </Box>

      {!isEditingLimitPrice && (
        <>
          <PerpsAmountDisplay
            amount={displayUSDString}
            showWarning={false}
            onPress={handleAmountPress}
            isActive={isInputFocused}
            tokenAmount={formatPositionSize(liveCloseAmount, szDecimals)}
            hasError={filteredErrors.length > 0}
            tokenSymbol={position.symbol}
            showMaxAmount={false}
          />

          <Box twClassName="items-center px-4 pt-0 pb-2">
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              {tokenAmountLabel}
            </Text>
          </Box>
        </>
      )}

      {!isKeypadVisible && (
        <Box twClassName="px-4 py-4" onTouchCancel={handleSliderDragCancel}>
          <Slider
            value={displayClosePercentage}
            onValueChange={handleSliderValueChange}
            onDragEnd={handleSliderDragEnd}
            minimumValue={0}
            maximumValue={100}
            step={1}
            showRangeLabels
            showRangeDots
            isDisabled={isClosing}
            onGrip={handleSliderGrip}
            onMark={handleSliderMark}
          />
        </Box>
      )}

      {isClosePositionLimitOrderEnabled && (
        <Box twClassName="flex-row items-center justify-between px-4 py-2">
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
            {strings('perps.order.type.title')}
          </Text>
          <SegmentedControl
            value={effectiveOrderType}
            onChange={handleOrderTypeChange}
            size={SegmentedControlSize.Sm}
            testID={PerpsClosePositionBottomSheetSelectorsIDs.ORDER_TYPE_CONTROL}
          >
            <FilterButton
              value="market"
              testID={
                PerpsClosePositionBottomSheetSelectorsIDs.ORDER_TYPE_MARKET
              }
            >
              {strings('perps.order.market')}
            </FilterButton>
            <FilterButton
              value="limit"
              testID={PerpsClosePositionBottomSheetSelectorsIDs.ORDER_TYPE_LIMIT}
            >
              {strings('perps.order.limit')}
            </FilterButton>
          </SegmentedControl>
        </Box>
      )}

      {effectiveOrderType === 'limit' && (
        <Box twClassName="px-4 py-2">
          <TouchableOpacity onPress={() => setIsEditingLimitPrice(true)}>
            <TextField
              testID={
                PerpsClosePositionBottomSheetSelectorsIDs.LIMIT_PRICE_INPUT
              }
              value={limitPriceInput.formattedLimitPrice}
              placeholder={strings('perps.order.limit_price')}
              isReadOnly
              isError={limitPriceInput.hasError}
              startAccessory={
                <Text
                  variant={TextVariant.BodyMd}
                  color={TextColor.TextAlternative}
                >
                  $
                </Text>
              }
              inputProps={{ showSoftInputOnFocus: false }}
            />
          </TouchableOpacity>
          {limitPriceInput.error ? (
            <HelpText severity={HelpTextSeverity.Danger} showIcon>
              {limitPriceInput.error}
            </HelpText>
          ) : null}
        </Box>
      )}

      {!isKeypadVisible && (
        <>
          <KeyValueRow
            variant={KeyValueRowVariant.Summary}
            keyLabel={strings('perps.close_position.margin')}
            value={formatPerpsFiat(summaryMargin, {
              ranges: PRICE_RANGES_MINIMAL_VIEW,
            })}
            valueTextProps={{
              testID: PerpsClosePositionBottomSheetSelectorsIDs.MARGIN_VALUE,
            }}
          />

          <KeyValueRow
            variant={KeyValueRowVariant.Summary}
            keyLabel={strings('perps.close_position.fees')}
            keyEndButtonIconProps={{
              iconName: IconName.Info,
              onPress: handleFeesTooltipPress,
              testID:
                PerpsClosePositionBottomSheetSelectorsIDs.FEES_TOOLTIP_BUTTON,
            }}
            value={feesValue}
          />

          <SectionDivider marginVertical={1} twClassName="mx-4" />

          <KeyValueRow
            variant={KeyValueRowVariant.Summary}
            keyLabel={strings('perps.close_position.total_inc_pnl')}
            keyEndButtonIconProps={{
              iconName: IconName.Info,
              onPress: handleTotalTooltipPress,
              testID:
                PerpsClosePositionBottomSheetSelectorsIDs.TOTAL_TOOLTIP_BUTTON,
            }}
            value={
              <View>
                <Text
                  variant={TextVariant.BodyMd}
                  fontWeight={FontWeight.Medium}
                  testID={
                    PerpsClosePositionBottomSheetSelectorsIDs.TOTAL_VALUE
                  }
                >
                  {formatPerpsFiat(receiveAmount, {
                    ranges: PRICE_RANGES_MINIMAL_VIEW,
                  })}
                </Text>
                <Text
                  variant={TextVariant.BodySm}
                  color={
                    summaryPnl < 0
                      ? TextColor.ErrorDefault
                      : TextColor.SuccessDefault
                  }
                  testID={PerpsClosePositionBottomSheetSelectorsIDs.TOTAL_PNL}
                >
                  {`(${summaryPnl < 0 ? '-' : '+'}${formatPerpsFiat(
                    Math.abs(summaryPnl),
                    { ranges: PRICE_RANGES_MINIMAL_VIEW },
                  )})`}
                </Text>
              </View>
            }
          />
        </>
      )}

      <Box twClassName="px-4">
        {filteredErrors.map((error, index) => (
          <HelpText
            key={`error-${index}`}
            severity={HelpTextSeverity.Danger}
            twClassName="w-full justify-center text-center"
          >
            {error}
          </HelpText>
        ))}
      </Box>

      <BottomSheetFooter primaryButtonProps={confirmButtonProps} />

      {isEditingLimitPrice && (
        <>
          <Box twClassName="flex-row gap-2 px-4 pt-3">
            {limitPriceInput.presets.map((preset) => (
              <Button
                key={preset.testID}
                testID={preset.testID}
                variant={ButtonVariant.Secondary}
                size={ButtonSize.Md}
                twClassName="flex-1"
                onPress={preset.onPress}
              >
                {preset.label}
              </Button>
            ))}
            <Button
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Md}
              onPress={handleLimitPriceDone}
            >
              {strings('perps.deposit.done_button')}
            </Button>
          </Box>

          <Box twClassName="mb-4 px-4">
            <Keypad
              value={limitPrice}
              currency="USD_PERPS"
              onChange={limitPriceInput.handleKeypadChange}
              decimals={5}
            />
          </Box>
        </>
      )}

      {isInputFocused && !isEditingLimitPrice && (
        <>
          <Box twClassName="flex-row justify-between px-4 pt-3 mb-3 gap-2">
            <Button
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Md}
              onPress={() => handlePercentagePress(0.25)}
              twClassName="flex-1"
            >
              25%
            </Button>
            <Button
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Md}
              onPress={() => handlePercentagePress(0.5)}
              twClassName="flex-1"
            >
              50%
            </Button>
            <Button
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Md}
              onPress={handleMaxPress}
              twClassName="flex-1"
            >
              {strings('perps.deposit.max_button')}
            </Button>
            <Button
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Md}
              onPress={handleDonePress}
              twClassName="flex-1"
            >
              {strings('perps.deposit.done_button')}
            </Button>
          </Box>

          <Box twClassName="mb-4 px-4">
            <Keypad
              value={closeAmountUSDString}
              onChange={handleKeypadChange}
              currency={'USD'}
              decimals={2}
            />
          </Box>
        </>
      )}
    </BottomSheet>
  );
};

export default PerpsClosePositionBottomSheet;
