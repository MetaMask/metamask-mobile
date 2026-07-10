import React, { useCallback, useMemo, useRef } from 'react';
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
import { Image, TouchableOpacity } from 'react-native';
import MoneyIcon from '../../../../../../images/money.png';
import { Box } from '../../../../../UI/Box/Box';
import {
  AlignItems,
  FlexDirection,
  JustifyContent,
} from '../../../../../UI/Box/box.types';
import {
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Skeleton,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useStyles } from '../../../../../hooks/useStyles';
import styleSheet from './pay-with-row.styles';
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

export function PayWithRow({
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

function PayWithRowLayout({
  label,
  disabled,
  showArrow,
  onPress,
  children,
}: {
  label: string;
  disabled?: boolean;
  showArrow?: boolean;
  onPress?: () => void;
  children: React.ReactNode;
}) {
  const { styles } = useStyles(styleSheet, {});

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      testID={ConfirmationRowComponentIDs.PAY_WITH}
    >
      <Box
        flexDirection={FlexDirection.Row}
        alignItems={AlignItems.center}
        justifyContent={JustifyContent.spaceBetween}
        style={styles.container}
      >
        <Text
          variant={TextVariant.BodyMd}
          color={disabled ? TextColor.TextMuted : TextColor.TextAlternative}
        >
          {label}
        </Text>
        <Box
          flexDirection={FlexDirection.Row}
          alignItems={AlignItems.center}
          gap={8}
        >
          {children}
          {showArrow && (
            <Icon
              name={IconName.ArrowDown}
              size={IconSize.Sm}
              color={disabled ? IconColor.IconMuted : IconColor.IconAlternative}
            />
          )}
        </Box>
      </Box>
    </TouchableOpacity>
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
    >
      <TokenIcon
        address={displayToken.address}
        chainId={displayToken.chainId}
        symbol={displayToken.symbol}
        variant={TokenIconVariant.Row}
      />
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Medium}
        color={isDisabled ? TextColor.TextMuted : TextColor.TextDefault}
        testID={TransactionPayComponentIDs.PAY_WITH_SYMBOL}
      >
        {displayToken.symbol}
        {!isWithdraw && (
          <Text
            color={TextColor.TextAlternative}
            testID={TransactionPayComponentIDs.PAY_WITH_BALANCE}
          >
            {` (${balanceUsdFormatted})`}
          </Text>
        )}
      </Text>
    </PayWithRowLayout>
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
    >
      <PaymentMethodIcon
        paymentMethodType={paymentMethod.paymentType as PaymentType}
        size={20}
        color={disabled ? colors.icon.muted : colors.icon.default}
      />
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Medium}
        color={disabled ? TextColor.TextMuted : TextColor.TextDefault}
        testID={TransactionPayComponentIDs.PAY_WITH_SYMBOL}
      >
        {paymentMethod.name}
      </Text>
    </PayWithRowLayout>
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
    >
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Medium}
        color={TextColor.TextAlternative}
        testID={TransactionPayComponentIDs.PAY_WITH_SYMBOL}
      >
        {strings('confirm.label.select_token')}
      </Text>
    </PayWithRowLayout>
  );
}

function PayWithRowMoneyAccount() {
  const navigation = useNavigation();
  const { isWithdraw } = useTransactionPayWithdraw();
  const { styles } = useStyles(styleSheet, {});
  const { setConfirmationMetric } = useConfirmationMetricEvents();
  const { preferredPaymentToken } = useParams<PayWithRouteParams>({});

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
    >
      <Image source={MoneyIcon} style={styles.moneyIcon} />
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Medium}
        color={TextColor.TextDefault}
        testID={TransactionPayComponentIDs.PAY_WITH_SYMBOL}
      >
        {strings('confirm.pay_with_bottom_sheet.money_account')}
      </Text>
    </PayWithRowLayout>
  );
}

export function PayWithRowSkeleton() {
  const { styles } = useStyles(styleSheet, {});

  return (
    <Box
      testID="pay-with-row-skeleton"
      flexDirection={FlexDirection.Row}
      alignItems={AlignItems.center}
      justifyContent={JustifyContent.spaceBetween}
      style={styles.skeletonContainer}
    >
      <Skeleton height={18} width={60} style={styles.skeletonTop} />
      <Box
        flexDirection={FlexDirection.Row}
        alignItems={AlignItems.center}
        gap={8}
      >
        <Skeleton height={32} width={32} style={styles.skeletonCircle} />
        <Skeleton height={18} width={120} style={styles.skeletonTop} />
      </Box>
    </Box>
  );
}
