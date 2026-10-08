import React from 'react';
import { useSelector } from 'react-redux';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  ListItem,
  ListItemVariant,
  SensitiveText,
  SensitiveTextLength,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import I18n, { strings } from '../../../../../../locales/i18n';
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

interface HomepageBalanceBreakdownMoneyBuyButtonProps {
  accessibilityLabel: string;
  label: string;
}

const HomepageBalanceBreakdownMoneyBuyButton = ({
  accessibilityLabel,
  label,
}: HomepageBalanceBreakdownMoneyBuyButtonProps) => {
  const { trackButtonClicked } = useMoneyAnalytics({
    screen_name: SCREEN_NAMES.WALLET_HOME,
    component_name: COMPONENT_NAMES.MONEY_ACTION_BUTTON_ROW,
  });
  const { handleAddPress } = useMoneyAddMoney({
    buttonLabelKey: 'homepage.action_buttons.buy',
    logTag: '[HomepageBalanceBreakdownRow]',
    trackButtonClicked,
  });

  return (
    <Button
      accessibilityLabel={accessibilityLabel}
      onPress={handleAddPress}
      size={ButtonSize.Sm}
      testID={HomepageBalanceBreakdownTestIds.MONEY_BUY}
      twClassName="h-7 self-end px-4"
      variant={ButtonVariant.Primary}
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
  const isLoading = slice.status === 'loading';
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
  const showMoneyBuyButton = slice.key === 'money';
  const moneyBuyLabel = strings('homepage.action_buttons.buy');
  const accessibilityLabel = [
    getSliceLabel(slice.key),
    !privacyMode && !showMoneyBuyButton && slice.status === 'ready'
      ? displayValue
      : undefined,
    !privacyMode ? percentageLabel : undefined,
    !privacyMode ? apyLabel : undefined,
    showMoneyBuyButton ? moneyBuyLabel : undefined,
  ]
    .filter(Boolean)
    .join(', ');
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
      {slice.key === 'money' && slice.apyLoading ? (
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

  const value = showMoneyBuyButton ? (
    <HomepageBalanceBreakdownMoneyBuyButton
      accessibilityLabel={accessibilityLabel}
      label={moneyBuyLabel}
    />
  ) : (
    <Skeleton
      hideChildren={isLoading}
      testID={HomepageBalanceBreakdownTestIds.SKELETON(slice.key)}
    >
      <DottedUnderline
        color={colors.text.alternative}
        testID={HomepageBalanceBreakdownTestIds.VALUE_UNDERLINE(slice.key)}
      >
        <SensitiveText
          color={valueColor}
          isHidden={privacyMode}
          length={SensitiveTextLength.Medium}
          testID={HomepageBalanceBreakdownTestIds.VALUE(slice.key)}
          variant={TextVariant.BodyMd}
        >
          {displayValue}
        </SensitiveText>
      </DottedUnderline>
    </Skeleton>
  );

  return (
    <ListItem
      accessible={!showMoneyBuyButton}
      accessibilityLabel={accessibilityLabel}
      isInteractive
      onPress={onPress}
      testID={HomepageBalanceBreakdownTestIds.ROW(slice.key)}
      title={title}
      twClassName="min-h-10 py-0"
      value={value}
      variant={ListItemVariant.OneLine}
    />
  );
};

export default HomepageBalanceBreakdownRow;
