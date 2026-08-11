import React, { memo, useCallback, useMemo, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../../core/NavigationService/types';
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
import { Image } from 'react-native';
import MoneyIcon from '../../../../../../images/money.png';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  IconColor,
  KeyValueSelect,
  KeyValueSelectVariant,
  Skeleton,
  TextColor,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
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

type PayWithEndArrow = 'down' | 'right';

function PayWithRowLayout({
  label,
  disabled,
  endArrow,
  onPress,
  startAccessory,
  value,
  balance,
  placeholder,
}: {
  label: string;
  disabled?: boolean;
  /**
   * Trailing chevron on the SelectButton.
   * Use `down` for bottom sheets, `right` for full-screen navigation.
   * Omit when the row is not selectable.
   */
  endArrow?: PayWithEndArrow;
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

  // SelectButton cannot show both endAccessory and its built-in arrow, so append
  // balance to the string value and let selectButtonProps own the chevron.
  const selectValue =
    value != null && balance != null ? `${value} (${balance})` : value;

  return (
    <KeyValueSelect
      testID={ConfirmationRowComponentIDs.PAY_WITH}
      variant={KeyValueSelectVariant.Summary}
      keyLabel={label}
      keyTextProps={{
        color: disabled ? TextColor.TextMuted : TextColor.TextAlternative,
      }}
      value={selectValue}
      valueStartAccessory={startAccessory}
      valueTextProps={{
        color: disabled ? TextColor.TextMuted : TextColor.TextDefault,
        ...(balance != null
          ? { testID: TransactionPayComponentIDs.PAY_WITH_BALANCE }
          : {}),
      }}
      isDisabled={disabled}
      onPress={handlePress}
      selectButtonProps={{
        placeholder: placeholder ?? strings('confirm.label.select_token'),
        hideEndArrow: !endArrow,
        ...(endArrow
          ? {
              endArrowDirection: endArrow,
              endArrowDirectionIconProps: {
                color: disabled ? IconColor.IconMuted : IconColor.IconDefault,
              },
            }
          : {}),
        // testID is forwarded to SelectButton but omitted from shared selectButtonProps.
        ...({
          testID: TransactionPayComponentIDs.PAY_WITH_SYMBOL,
        } as object),
      }}
    />
  );
}

function PayWithRowInteractive() {
  const navigation = useNavigation<AppNavigationProp>();
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
      endArrow={from ? 'down' : undefined}
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
      endArrow={hasFrom ? 'down' : undefined}
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
      endArrow={hasFrom ? 'down' : undefined}
      onPress={onPress}
      value={null}
      placeholder={strings('confirm.label.select_payment_method')}
    />
  );
}

function PayWithRowMoneyAccount() {
  const navigation = useNavigation<AppNavigationProp>();
  const { isWithdraw } = useTransactionPayWithdraw();
  const { setConfirmationMetric } = useConfirmationMetricEvents();
  const { preferredPaymentToken } = useParams<PayWithRouteParams>({});
  const { colors } = useTheme();
  const tw = useTailwind();

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
      endArrow="down"
      onPress={handleClick}
      startAccessory={
        <Image
          source={MoneyIcon}
          style={[
            tw`size-5 rounded`,
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
      twClassName="px-4 py-3"
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
