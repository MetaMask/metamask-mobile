import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { PaymentType } from '@consensys/on-ramp-sdk';
import { BigNumber } from 'bignumber.js';
import {
  FontWeight,
  Skeleton,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { type PaymentMethod } from '@metamask/ramps-controller';
import { TransactionType } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';

import { strings } from '../../../../../../../locales/i18n';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../../component-library/components/Icons/Icon';
import Routes from '../../../../../../constants/navigation/Routes';
import { isHardwareAccount } from '../../../../../../util/address';
import { useStyles } from '../../../../../hooks/useStyles';
import PaymentMethodIcon from '../../../../../UI/Ramp/Aggregator/components/PaymentMethodIcon';
import { Box } from '../../../../../UI/Box/Box';
import {
  AlignItems,
  FlexDirection,
  JustifyContent,
} from '../../../../../UI/Box/box.types';
import {
  MUSD_TOKEN,
  MUSD_TOKEN_ADDRESS,
  MUSD_CONVERSION_DEFAULT_CHAIN_ID,
} from '../../../../../UI/Earn/constants/musd';
import useFiatFormatter from '../../../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter';
import {
  ConfirmationRowComponentIDs,
  TransactionPayComponentIDs,
} from '../../../ConfirmationView.testIds';
import { useAccountTokens } from '../../../hooks/send/useAccountTokens';
import { useConfirmationMetricEvents } from '../../../hooks/metrics/useConfirmationMetricEvents';
import { useTransactionPayToken } from '../../../hooks/pay/useTransactionPayToken';
import { useTransactionPayRequiredTokens } from '../../../hooks/pay/useTransactionPayData';
import { useTransactionPaySelectedFiatPaymentMethod } from '../../../hooks/pay/useTransactionPaySelectedFiatPaymentMethod';
import { useTransactionPayWithdraw } from '../../../hooks/pay/useTransactionPayWithdraw';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import { isTestNet } from '../../../../../../util/networks';
import { hasTransactionType } from '../../../utils/transaction';
import { TokenIcon, TokenIconVariant } from '../../token-icon';
import styleSheet from './pay-with-row.styles';

const MUSD_FALLBACK_TOKEN = {
  address: MUSD_TOKEN_ADDRESS,
  chainId: MUSD_CONVERSION_DEFAULT_CHAIN_ID,
  symbol: MUSD_TOKEN.symbol,
  decimals: MUSD_TOKEN.decimals,
} as const;
interface PayWithRowProps {
  selectedAccount?: string;
}

export function PayWithRow({ selectedAccount }: PayWithRowProps = {}) {
  const navigation = useNavigation();
  const { payToken, setPayToken } = useTransactionPayToken();
  const { isWithdraw } = useTransactionPayWithdraw();
  const requiredTokens = useTransactionPayRequiredTokens();
  const selectedFiatPaymentMethod =
    useTransactionPaySelectedFiatPaymentMethod();
  const formatFiat = useFiatFormatter({ currency: 'usd' });
  const { styles } = useStyles(styleSheet, {});
  const { setConfirmationMetric } = useConfirmationMetricEvents();

  const transactionMeta = useTransactionMetadataRequest();
  const {
    txParams: { from },
  } = transactionMeta ?? { txParams: {} };

  const isMoneyAccountWithdraw = hasTransactionType(transactionMeta, [
    TransactionType.moneyAccountWithdraw,
  ]);
  const isMoneyAccountDeposit = hasTransactionType(transactionMeta, [
    TransactionType.moneyAccountDeposit,
  ]);

  const accountTokens = useAccountTokens({
    accountAddress: selectedAccount,
  });
  const isAwaitingAccountSelection =
    (isMoneyAccountDeposit || isMoneyAccountWithdraw) && !selectedAccount;

  const canEdit = !isHardwareAccount(from ?? '');
  const prevSelectedAccountRef = useRef(selectedAccount);

  useEffect(() => {
    if (selectedAccount && selectedAccount !== prevSelectedAccountRef.current) {
      prevSelectedAccountRef.current = selectedAccount;
    }
  }, [selectedAccount]);

  useEffect(() => {
    if (!selectedAccount) {
      return;
    }

    if (isMoneyAccountWithdraw) {
      setPayToken({
        address: MUSD_TOKEN_ADDRESS,
        chainId: MUSD_CONVERSION_DEFAULT_CHAIN_ID,
      });
      return;
    }

    const firstEvmToken = accountTokens.find(
      (t) => t.chainId?.startsWith('0x') && !isTestNet(t.chainId),
    );

    if (isMoneyAccountDeposit && firstEvmToken) {
      setPayToken({
        address: firstEvmToken.address as Hex,
        chainId: firstEvmToken.chainId as Hex,
      });
    }
  }, [
    accountTokens,
    isMoneyAccountDeposit,
    isMoneyAccountWithdraw,
    selectedAccount,
    setPayToken,
  ]);

  const isDisabled = !canEdit || isAwaitingAccountSelection;

  const handleClick = useCallback(() => {
    if (isDisabled) return;
    setConfirmationMetric({
      properties: {
        mm_pay_token_list_opened: true,
      },
    });
    navigation.navigate(Routes.CONFIRMATION_PAY_WITH_MODAL);
  }, [isDisabled, navigation, setConfirmationMetric]);

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
    if (isMoneyAccountWithdraw) {
      return payToken ?? MUSD_FALLBACK_TOKEN;
    }
    if (isWithdraw) {
      return payToken ?? defaultWithdrawToken ?? null;
    }
    return payToken ?? null;
  }, [isMoneyAccountWithdraw, isWithdraw, payToken, defaultWithdrawToken]);

  // For deposits, show the user's balance of the selected pay token
  const balanceUsdFormatted = useMemo(
    () => formatFiat(new BigNumber(payToken?.balanceUsd ?? '0')),
    [formatFiat, payToken?.balanceUsd],
  );

  if (selectedFiatPaymentMethod) {
    return (
      <PayWithFiatPaymentMethodRow
        paymentMethod={selectedFiatPaymentMethod}
        label={label}
        canEdit={canEdit}
        hasFrom={Boolean(from)}
        onPress={handleClick}
      />
    );
  }

  if (isAwaitingAccountSelection) {
    return (
      <Box
        flexDirection={FlexDirection.Row}
        alignItems={AlignItems.center}
        justifyContent={JustifyContent.spaceBetween}
        style={[styles.container, styles.disabled]}
        testID={ConfirmationRowComponentIDs.PAY_WITH}
      >
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {label}
        </Text>
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextAlternative}
          testID={TransactionPayComponentIDs.PAY_WITH_SYMBOL}
        >
          {strings('confirm.label.payment_method')}
        </Text>
      </Box>
    );
  }

  if (!displayToken) {
    return <PayWithRowSkeleton />;
  }

  return (
    <TouchableOpacity
      onPress={handleClick}
      disabled={isDisabled}
      testID={ConfirmationRowComponentIDs.PAY_WITH}
    >
      <Box
        flexDirection={FlexDirection.Row}
        alignItems={AlignItems.center}
        justifyContent={JustifyContent.spaceBetween}
        style={styles.container}
      >
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {label}
        </Text>
        <Box
          flexDirection={FlexDirection.Row}
          alignItems={AlignItems.center}
          gap={8}
        >
          <TokenIcon
            address={displayToken.address}
            chainId={displayToken.chainId}
            variant={TokenIconVariant.Row}
          />
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextDefault}
            testID={TransactionPayComponentIDs.PAY_WITH_SYMBOL}
          >
            {displayToken.symbol}
            {!isWithdraw && (
              <Text testID={TransactionPayComponentIDs.PAY_WITH_BALANCE}>
                {` (${balanceUsdFormatted})`}
              </Text>
            )}
          </Text>
          {!isDisabled && from && (
            <Icon
              name={IconName.ArrowDown}
              size={IconSize.Sm}
              color={IconColor.Alternative}
            />
          )}
        </Box>
      </Box>
    </TouchableOpacity>
  );
}

function PayWithFiatPaymentMethodRow({
  paymentMethod,
  label,
  canEdit,
  hasFrom,
  onPress,
}: {
  paymentMethod: PaymentMethod;
  label: string;
  canEdit: boolean;
  hasFrom: boolean;
  onPress: () => void;
}) {
  const { styles } = useStyles(styleSheet, {});

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!canEdit}
      testID={ConfirmationRowComponentIDs.PAY_WITH}
    >
      <Box
        flexDirection={FlexDirection.Row}
        alignItems={AlignItems.center}
        justifyContent={JustifyContent.spaceBetween}
        style={styles.container}
      >
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {label}
        </Text>
        <Box
          flexDirection={FlexDirection.Row}
          alignItems={AlignItems.center}
          gap={8}
        >
          <PaymentMethodIcon
            paymentMethodType={paymentMethod.paymentType as PaymentType}
            size={20}
          />
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextDefault}
            testID={TransactionPayComponentIDs.PAY_WITH_SYMBOL}
          >
            {paymentMethod.name}
          </Text>
          {canEdit && hasFrom && (
            <Icon
              name={IconName.ArrowDown}
              size={IconSize.Sm}
              color={IconColor.Alternative}
            />
          )}
        </Box>
      </Box>
    </TouchableOpacity>
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
