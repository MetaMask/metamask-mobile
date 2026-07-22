import React, { memo, useCallback, useMemo, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { PaymentType } from '@consensys/on-ramp-sdk';
import Routes from '../../../../../../constants/navigation/Routes';
import { RootState } from '../../../../../../reducers';
import { selectPaymentOverrideByTransactionId } from '../../../../../../selectors/transactionPayController';
import { TokenIcon, TokenIconVariant } from '../../token-icon';
import { useTransactionPayToken } from '../../../hooks/pay/useTransactionPayToken';
import { useTransactionPayWithdraw } from '../../../hooks/pay/useTransactionPayWithdraw';
import { useTransactionPayRequiredTokens } from '../../../hooks/pay/useTransactionPayData';
import { useTransactionPayAvailableTokens } from '../../../hooks/pay/useTransactionPayAvailableTokens';
import { useAccountNoFundsAlert } from '../../../hooks/alerts/useAccountNoFundsAlert';
import { useTransactionPaySelectedFiatPaymentMethod } from '../../../hooks/pay/useTransactionPaySelectedFiatPaymentMethod';
import { Image, Pressable, StyleSheet } from 'react-native';
import MoneyIcon from '../../../../../../images/money.png';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  KeyValueRow,
  KeyValueRowVariant,
  SelectButton,
  SelectButtonSize,
  SelectButtonVariant,
  Skeleton,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { BigNumber } from 'bignumber.js';
import { PaymentOverride } from '@metamask/transaction-pay-controller';
import { strings } from '../../../../../../../locales/i18n';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import { isHardwareAccount } from '../../../../../../util/address';
import PaymentMethodIcon from '../../../../../UI/Ramp/Aggregator/components/PaymentMethodIcon';
import useFiatFormatter from '../../../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter';
import {
  ConfirmationRowComponentIDs,
  TransactionPayComponentIDs,
} from '../../../ConfirmationView.testIds';
import { useConfirmationMetricEvents } from '../../../hooks/metrics/useConfirmationMetricEvents';
import { type PaymentMethod } from '@metamask/ramps-controller';
import { useParams } from '../../../../../../util/navigation/navUtils';
import {
  ConfirmationParams,
  PayWithOption,
} from '../../confirm/confirm-component';
import { SetPayTokenRequest } from '../../../hooks/pay/useAutomaticTransactionPayToken';
import { useIsMoneyAccountFlagDefault } from '../../../hooks/pay/useIsMoneyAccountFlagDefault';
import { useConfirmationContext } from '../../../context/confirmation-context';
import { useTheme } from '../../../../../../util/theme';
import { usePayTokenAccountBalance } from '../../../hooks/pay/usePayTokenAccountBalance';

const moneyIconStyles = StyleSheet.create({
  moneyIcon: {
    width: 20,
    height: 20,
    borderRadius: 4,
  },
});

interface PayWithRouteParams {
  preferredPaymentToken?: SetPayTokenRequest;
}

function PayWithRowComponent({
  isResultReady,
}: { isResultReady?: boolean } = {}) {
  const transactionMeta = useTransactionMetadataRequest();
  const transactionId = transactionMeta?.id ?? '';
  const paymentOverride = useSelector((state: RootState) =>
    selectPaymentOverrideByTransactionId(state, transactionId),
  );
  const { payWithOption } = useParams<ConfirmationParams>({});
  const isDefaultMoneyAccount = useIsMoneyAccountFlagDefault();

  // Once the controller has set a paymentOverride (even if later cleared by the
  // user switching away), Redux is the source of truth and the flag-based
  // default no longer applies.
  const overrideApplied = useRef(false);
  if (paymentOverride !== undefined) {
    overrideApplied.current = true;
  }

  // Nav-param means money home pre-set the method; bottom-sheet selection doesn't set this.
  if (payWithOption === PayWithOption.MoneyAccount) {
    return null;
  }

  // Explicit selection via controller — always honor it.
  if (paymentOverride === PaymentOverride.MoneyAccount) {
    return <PayWithRowMoneyAccount />;
  }

  // Flag-based default — step aside when results are ready so user can change.
  if (isDefaultMoneyAccount && !overrideApplied.current && !isResultReady) {
    return <PayWithRowMoneyAccount />;
  }

  return <PayWithRowInteractive />;
}

export const PayWithRow = memo(PayWithRowComponent);

function PayWithRowLayout({
  label,
  disabled,
  showArrow,
  onPress,
  startAccessory,
  value,
  balance,
  placeholder,
}: {
  label: string;
  disabled?: boolean;
  showArrow?: boolean;
  onPress?: () => void;
  startAccessory?: React.ReactNode;
  /** Selected label for the SelectButton. Null/undefined shows placeholder. */
  value?: string | null;
  /** Optional balance shown after the value (e.g. "($8.92)"). */
  balance?: string;
  placeholder?: string;
}) {
  const handlePress = () => {
    if (disabled) {
      return;
    }
    onPress?.();
  };

  const selectPlaceholder =
    placeholder ?? strings('confirm.label.select_token');

  const endAccessory =
    balance != null ? (
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        gap={1}
      >
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          color={disabled ? TextColor.TextMuted : TextColor.TextDefault}
          testID={TransactionPayComponentIDs.PAY_WITH_BALANCE}
        >
          {`(${balance})`}
        </Text>
        {showArrow && (
          <Icon
            name={IconName.ArrowDown}
            size={IconSize.Sm}
            color={disabled ? IconColor.IconMuted : IconColor.IconAlternative}
          />
        )}
      </Box>
    ) : undefined;

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      accessibilityRole="button"
      testID={ConfirmationRowComponentIDs.PAY_WITH}
      style={({ pressed }) => ({
        opacity: pressed && !disabled ? 0.7 : 1,
      })}
    >
      <KeyValueRow
        // Parent scroll content is padded 16px; cancel it (-mr-4) then apply
        // 4px row padding (pr-1) so with SelectButton Md's 12px right padding
        // (px-3) the caret sits 16px from the screen edge.
        twClassName="-mr-4 pr-1"
        variant={KeyValueRowVariant.Summary}
        keyLabel={
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            color={disabled ? TextColor.TextMuted : TextColor.TextAlternative}
          >
            {label}
          </Text>
        }
        value={
          <SelectButton
            size={SelectButtonSize.Md}
            variant={SelectButtonVariant.Secondary}
            placeholder={selectPlaceholder}
            value={value}
            startAccessory={startAccessory}
            onPress={handlePress}
            isDisabled={disabled}
            hideEndArrow={Boolean(endAccessory) || !showArrow}
            endAccessory={endAccessory}
            testID={TransactionPayComponentIDs.PAY_WITH_SYMBOL}
          />
        }
      />
    </Pressable>
  );
}

function PayWithRowInteractive() {
  const navigation = useNavigation();
  const { payToken } = useTransactionPayToken();
  const { isWithdraw } = useTransactionPayWithdraw();
  const requiredTokens = useTransactionPayRequiredTokens();
  const accountNoFundsAlert = useAccountNoFundsAlert();
  const hasAccountNoFunds = accountNoFundsAlert.length > 0;
  const { hasTokens: hasAvailableTokens } = useTransactionPayAvailableTokens();
  const selectedFiatPaymentMethod =
    useTransactionPaySelectedFiatPaymentMethod();
  const formatFiat = useFiatFormatter({ currency: 'usd' });
  const { setConfirmationMetric } = useConfirmationMetricEvents();
  const { preferredPaymentToken } = useParams<PayWithRouteParams>({});

  const {
    txParams: { from },
  } = useTransactionMetadataRequest() ?? { txParams: {} };

  const { balanceUsd: accountBalanceUsd } = usePayTokenAccountBalance();
  const { isHeadlessBuyInProgress } = useConfirmationContext();
  const canEdit = !isHardwareAccount(from ?? '');

  const isDisabled = !canEdit || isHeadlessBuyInProgress;

  const handleClick = useCallback(() => {
    if (isDisabled) return;
    setConfirmationMetric({
      properties: {
        mm_pay_token_list_opened: true,
      },
    });
    navigation.navigate(Routes.CONFIRMATION_PAY_WITH_BOTTOM_SHEET, {
      preferredPaymentToken,
    });
  }, [isDisabled, navigation, preferredPaymentToken, setConfirmationMetric]);

  const label = isWithdraw
    ? strings('confirm.label.receive_as')
    : strings('confirm.label.pay_with');

  // For withdrawals, default to the primary required token (where funds are going)
  // if no payment token has been explicitly selected.
  // Filter out skipIfBalance (optional if user already holds) and allowUnderMinimum
  // (fallback/optional) entries — neither represents the primary destination token.
  const defaultWithdrawToken = requiredTokens?.find(
    (token) => !token.skipIfBalance && !token.allowUnderMinimum,
  );
  const displayToken = useMemo(() => {
    if (hasAccountNoFunds) {
      return null;
    }
    if (isWithdraw) {
      return payToken ?? defaultWithdrawToken ?? null;
    }
    return payToken ?? null;
  }, [hasAccountNoFunds, isWithdraw, payToken, defaultWithdrawToken]);

  const balanceUsdFormatted = useMemo(
    () =>
      formatFiat(
        new BigNumber(accountBalanceUsd).decimalPlaces(2, BigNumber.ROUND_DOWN),
      ),
    [formatFiat, accountBalanceUsd],
  );

  if (selectedFiatPaymentMethod) {
    return (
      <PayWithFiatPaymentMethodRow
        paymentMethod={selectedFiatPaymentMethod}
        label={label}
        disabled={isDisabled}
        hasFrom={Boolean(from)}
        onPress={handleClick}
      />
    );
  }

  if (!displayToken) {
    // Show skeleton only while tokens exist to auto-select from.
    // Without available tokens the skeleton never resolves (e.g. perps
    // deposit with zero balance and no fiat payment method selected).
    if (!hasAccountNoFunds && hasAvailableTokens) {
      return <PayWithRowSkeleton />;
    }

    return (
      <PayWithRowEmpty
        label={label}
        disabled={isDisabled}
        hasFrom={Boolean(from)}
        onPress={handleClick}
      />
    );
  }

  return (
    <PayWithRowLayout
      label={label}
      disabled={isDisabled}
      showArrow={Boolean(from)}
      onPress={handleClick}
      startAccessory={
        <TokenIcon
          address={displayToken.address}
          chainId={displayToken.chainId}
          symbol={displayToken.symbol}
          variant={TokenIconVariant.Row}
        />
      }
      value={displayToken.symbol}
      balance={isWithdraw ? undefined : balanceUsdFormatted}
    />
  );
}

function PayWithFiatPaymentMethodRow({
  paymentMethod,
  label,
  disabled,
  hasFrom,
  onPress,
}: {
  paymentMethod: PaymentMethod;
  label: string;
  disabled: boolean;
  hasFrom: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();

  return (
    <PayWithRowLayout
      label={label}
      disabled={disabled}
      showArrow={hasFrom}
      onPress={onPress}
      startAccessory={
        <PaymentMethodIcon
          paymentMethodType={paymentMethod.paymentType as PaymentType}
          size={20}
          color={disabled ? colors.icon.muted : colors.icon.default}
        />
      }
      value={paymentMethod.name}
    />
  );
}

function PayWithRowEmpty({
  label,
  disabled,
  hasFrom,
  onPress,
}: {
  label: string;
  disabled: boolean;
  hasFrom: boolean;
  onPress: () => void;
}) {
  return (
    <PayWithRowLayout
      label={label}
      disabled={disabled}
      showArrow={hasFrom}
      onPress={onPress}
      value={null}
    />
  );
}

function PayWithRowMoneyAccount() {
  const navigation = useNavigation();
  const { isWithdraw } = useTransactionPayWithdraw();
  const { setConfirmationMetric } = useConfirmationMetricEvents();
  const { preferredPaymentToken } = useParams<PayWithRouteParams>({});
  const { colors } = useTheme();

  const handleClick = useCallback(() => {
    setConfirmationMetric({
      properties: { mm_pay_token_list_opened: true },
    });
    navigation.navigate(Routes.CONFIRMATION_PAY_WITH_BOTTOM_SHEET, {
      preferredPaymentToken,
    });
  }, [navigation, preferredPaymentToken, setConfirmationMetric]);

  return (
    <PayWithRowLayout
      label={
        isWithdraw
          ? strings('confirm.label.receive_as')
          : strings('confirm.label.pay_with')
      }
      showArrow
      onPress={handleClick}
      startAccessory={
        <Image
          source={MoneyIcon}
          style={[
            moneyIconStyles.moneyIcon,
            { backgroundColor: colors.accent04.light },
          ]}
        />
      }
      value={strings('confirm.pay_with_bottom_sheet.money_account')}
    />
  );
}

export function PayWithRowSkeleton() {
  return (
    <Box
      testID="pay-with-row-skeleton"
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Between}
      twClassName="px-2 py-3"
    >
      <Skeleton height={18} width={60} />
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        gap={2}
      >
        <Skeleton height={32} width={32} twClassName="rounded-full" />
        <Skeleton height={18} width={120} />
      </Box>
    </Box>
  );
}
