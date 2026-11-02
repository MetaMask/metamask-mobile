import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSelector } from 'react-redux';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Button,
  ButtonSize,
  ButtonVariant,
  BottomSheet,
  BottomSheetHeader,
  ButtonIcon,
  ButtonIconSize,
  ButtonIconVariant,
  FontWeight,
  IconColor,
  IconName,
  IconSize,
  ListItem,
  ListItemVariant,
  SensitiveText,
  SensitiveTextLength,
  Text,
  TextColor,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import I18n, { strings } from '../../../../../../locales/i18n';
import ModalSafeAreaProvider from '../../../../../component-library/components-temp/ModalSafeAreaProvider';
import { Skeleton } from '../../../../../component-library/components-temp/Skeleton';
import { selectPrivacyMode } from '../../../../../selectors/preferencesController';
import { formatWithThreshold } from '../../../../../util/assets';
import { getIntlNumberFormatter } from '../../../../../util/intl';
import { useTheme } from '../../../../../util/theme';
import { useFormatters } from '../../../../hooks/useFormatters';
import DottedUnderline from '../../../../UI/DottedUnderline';
import {
  COMPONENT_NAMES,
  SCREEN_NAMES,
} from '../../../../UI/Money/constants/moneyEvents';
import { useMoneyAddMoney } from '../../../../UI/Money/hooks/useMoneyAddMoney';
import { useMoneyAnalytics } from '../../../../UI/Money/hooks/useMoneyAnalytics';
import type { SliceData } from '../../BalanceBreakdown/types';
import { HomepageBalanceBreakdownTestIds } from './HomepageBalanceBreakdown.testIds';
import { getSliceLabel } from './homepageBalanceBreakdown.constants';

const styles = StyleSheet.create({
  gestureRoot: {
    flex: 1,
  },
});

interface HomepageBalanceBreakdownMoneyAddButtonProps {
  accessibilityLabel: string;
  label: string;
}

const HomepageBalanceBreakdownMoneyAddButton = ({
  accessibilityLabel,
  label,
}: HomepageBalanceBreakdownMoneyAddButtonProps) => {
  const { trackButtonClicked } = useMoneyAnalytics({
    screen_name: SCREEN_NAMES.WALLET_HOME,
    component_name: COMPONENT_NAMES.MONEY_ROW_BALANCE_BREAKDOWN,
  });
  const { handleAddPress } = useMoneyAddMoney({
    buttonLabelKey: 'money.balance_card.add',
    logTag: '[HomepageBalanceBreakdownRow]',
    trackButtonClicked,
  });

  return label.length > 3 ? (
    <ButtonIcon
      accessibilityLabel={accessibilityLabel}
      iconName={IconName.Add}
      iconProps={{ size: IconSize.Sm }}
      onPress={handleAddPress}
      size={ButtonIconSize.Sm}
      testID={HomepageBalanceBreakdownTestIds.MONEY_BUY}
      twClassName="w-10 mx-1"
      variant={ButtonIconVariant.Filled}
    />
  ) : (
    <Button
      accessibilityLabel={accessibilityLabel}
      onPress={handleAddPress}
      size={ButtonSize.Sm}
      testID={HomepageBalanceBreakdownTestIds.MONEY_BUY}
      twClassName="h-7 shrink-0 px-4"
      variant={ButtonVariant.Secondary}
    >
      {label}
    </Button>
  );
};

export interface HomepageBalanceBreakdownRowProps {
  slice: SliceData;
  userCurrency: string;
  onPress: () => void;
}

const HomepageBalanceBreakdownRow = ({
  slice,
  userCurrency,
  onPress,
}: HomepageBalanceBreakdownRowProps) => {
  const privacyMode = useSelector(selectPrivacyMode);
  const { colors } = useTheme();
  const { formatCurrency } = useFormatters();
  const errorSheetRef = useRef<BottomSheetRef>(null);
  const [isErrorSheetVisible, setIsErrorSheetVisible] = useState(false);
  const isLoading = slice.status === 'loading';
  const hasError = slice.status === 'error';
  const isMoneyRow = slice.key === 'money';
  const percentageLabel =
    slice.status !== 'ready'
      ? null
      : formatWithThreshold(slice.percentOfTotal, 0.01, I18n.locale, {
          style: 'percent',
          maximumFractionDigits: 0,
        });
  const formattedValue = formatCurrency(slice.valueFiat, userCurrency);
  const zeroValue = formatCurrency(0, userCurrency);
  const displayValue =
    slice.status === 'error' || slice.status === 'ineligible'
      ? '—'
      : slice.valueFiat > 0 && formattedValue === zeroValue
        ? `<${formattedValue}`
        : formattedValue;
  const valueColor =
    slice.status === 'ready' && slice.valueFiat === 0
      ? TextColor.TextAlternative
      : TextColor.TextDefault;
  const moneyApy = slice.apyPercent;
  const formattedMoneyApy =
    moneyApy !== undefined
      ? getIntlNumberFormatter(I18n.locale, {
          maximumFractionDigits: 1,
        }).format(moneyApy)
      : undefined;
  const apyLabel =
    formattedMoneyApy !== undefined
      ? strings('money.apy_label', { percentage: formattedMoneyApy })
      : undefined;
  const moneyAddLabel = strings('money.balance_card.add');
  const rowAccessibilityLabel = [
    getSliceLabel(slice.key),
    !privacyMode && slice.status === 'ready' ? displayValue : undefined,
    !privacyMode ? percentageLabel : undefined,
    !privacyMode ? apyLabel : undefined,
    hasError
      ? strings('balance_breakdown.error.accessibility_label')
      : undefined,
  ]
    .filter(Boolean)
    .join(', ');
  const accessibilityLabel = [
    rowAccessibilityLabel,
    isMoneyRow ? moneyAddLabel : undefined,
  ]
    .filter(Boolean)
    .join(', ');
  const handleErrorPress = useCallback(() => {
    setIsErrorSheetVisible(true);
  }, []);
  const handleErrorSheetClose = useCallback(() => {
    setIsErrorSheetVisible(false);
  }, []);
  const handleErrorSheetRequestClose = useCallback(() => {
    errorSheetRef.current?.onCloseBottomSheet();
  }, []);

  useEffect(() => {
    if (isErrorSheetVisible) {
      errorSheetRef.current?.onOpenBottomSheet();
    }
  }, [isErrorSheetVisible]);

  const title = (
    <Box
      alignItems={BoxAlignItems.Center}
      flexDirection={BoxFlexDirection.Row}
      twClassName="min-w-0 flex-1"
      gap={2}
    >
      <Box
        alignItems={BoxAlignItems.Center}
        flexDirection={BoxFlexDirection.Row}
        twClassName="min-w-0 shrink"
        gap={1}
      >
        <Text
          color={TextColor.TextDefault}
          fontWeight={FontWeight.Medium}
          numberOfLines={1}
          twClassName="shrink"
          variant={TextVariant.BodyMd}
        >
          {getSliceLabel(slice.key)}
        </Text>
        {percentageLabel ? (
          <>
            <Text
              color={TextColor.TextAlternative}
              variant={TextVariant.BodyMd}
            >
              •
            </Text>
            <SensitiveText
              color={TextColor.TextAlternative}
              isHidden={privacyMode}
              length={SensitiveTextLength.Short}
              testID={HomepageBalanceBreakdownTestIds.PERCENTAGE(slice.key)}
              variant={TextVariant.BodyMd}
            >
              {percentageLabel}
            </SensitiveText>
          </>
        ) : null}
      </Box>
      {isMoneyRow && slice.apyLoading ? (
        <Skeleton
          height={20}
          testID={HomepageBalanceBreakdownTestIds.APY_SKELETON}
          twClassName="shrink-0"
          width={60}
        />
      ) : moneyApy !== undefined ? (
        <Box
          testID={HomepageBalanceBreakdownTestIds.APY}
          twClassName="shrink-0 rounded-md bg-success-muted px-1.5 py-0.5"
        >
          <Text
            color={TextColor.SuccessDefault}
            fontWeight={FontWeight.Medium}
            variant={TextVariant.BodySm}
          >
            {apyLabel}
          </Text>
        </Box>
      ) : null}
    </Box>
  );

  const balanceText = (
    <SensitiveText
      color={valueColor}
      isHidden={privacyMode}
      length={SensitiveTextLength.Medium}
      testID={HomepageBalanceBreakdownTestIds.VALUE(slice.key)}
      variant={TextVariant.BodyMd}
    >
      {displayValue}
    </SensitiveText>
  );

  const balanceValue = (
    <Skeleton
      hideChildren={isLoading}
      testID={HomepageBalanceBreakdownTestIds.SKELETON(slice.key)}
    >
      {hasError ? (
        balanceText
      ) : (
        <DottedUnderline
          color={colors.text.alternative}
          testID={HomepageBalanceBreakdownTestIds.VALUE_UNDERLINE(slice.key)}
        >
          {balanceText}
        </DottedUnderline>
      )}
    </Skeleton>
  );

  const errorIndicator = hasError ? (
    <ButtonIcon
      accessibilityLabel={strings(
        'balance_breakdown.error.accessibility_label',
      )}
      iconName={IconName.Danger}
      iconProps={{
        color: IconColor.IconAlternative,
        size: IconSize.Sm,
      }}
      onPress={handleErrorPress}
      size={ButtonIconSize.Sm}
      testID={HomepageBalanceBreakdownTestIds.ERROR_WARNING(slice.key)}
      twClassName="self-center"
    />
  ) : null;

  const value = isMoneyRow ? (
    <Box
      alignItems={BoxAlignItems.Center}
      flexDirection={BoxFlexDirection.Row}
      gap={2}
    >
      <HomepageBalanceBreakdownMoneyAddButton
        accessibilityLabel={accessibilityLabel}
        label={moneyAddLabel}
      />
      {errorIndicator}
      {balanceValue}
    </Box>
  ) : (
    <Box
      alignItems={BoxAlignItems.Center}
      flexDirection={BoxFlexDirection.Row}
      gap={2}
    >
      {errorIndicator}
      {balanceValue}
    </Box>
  );

  return (
    <>
      <ListItem
        accessibilityLabel={
          isMoneyRow ? rowAccessibilityLabel : accessibilityLabel
        }
        isInteractive
        onPress={onPress}
        testID={HomepageBalanceBreakdownTestIds.ROW(slice.key)}
        title={title}
        twClassName="min-h-10 py-0"
        value={value}
        variant={ListItemVariant.OneLine}
      />
      {hasError && isErrorSheetVisible ? (
        <Modal
          animationType="none"
          onRequestClose={handleErrorSheetRequestClose}
          presentationStyle="overFullScreen"
          statusBarTranslucent
          transparent
          visible
        >
          <ModalSafeAreaProvider>
            <GestureHandlerRootView
              style={styles.gestureRoot}
              testID={HomepageBalanceBreakdownTestIds.ERROR_SHEET_GESTURE_ROOT(
                slice.key,
              )}
            >
              <BottomSheet
                ref={errorSheetRef}
                onClose={handleErrorSheetClose}
                testID={HomepageBalanceBreakdownTestIds.ERROR_SHEET(slice.key)}
              >
                <BottomSheetHeader onClose={handleErrorSheetRequestClose}>
                  <Text variant={TextVariant.HeadingSm}>
                    {strings('balance_breakdown.error.title')}
                  </Text>
                </BottomSheetHeader>
                <Box twClassName="px-4 pb-8">
                  <Text
                    color={TextColor.TextAlternative}
                    testID={HomepageBalanceBreakdownTestIds.ERROR_SHEET_DESCRIPTION(
                      slice.key,
                    )}
                    variant={TextVariant.BodyMd}
                  >
                    {strings('balance_breakdown.error.description', {
                      primitive: getSliceLabel(slice.key),
                    })}
                  </Text>
                </Box>
              </BottomSheet>
            </GestureHandlerRootView>
          </ModalSafeAreaProvider>
        </Modal>
      ) : null}
    </>
  );
};

export default HomepageBalanceBreakdownRow;
