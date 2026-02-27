import React, { useCallback, useMemo } from 'react';
import { PaymentMethod } from '@metamask/ramps-controller';
import { useNavigation } from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import Routes from '../../../../../../constants/navigation/Routes';
import { TokenIcon } from '../../token-icon';
import { useTransactionPayToken } from '../../../hooks/pay/useTransactionPayToken';
import { useTransactionPayWithdraw } from '../../../hooks/pay/useTransactionPayWithdraw';
import { useTransactionPayRequiredTokens } from '../../../hooks/pay/useTransactionPayData';
import { TouchableOpacity } from 'react-native';
import { Box } from '../../../../../UI/Box/Box';
import {
  AlignItems,
  FlexDirection,
  JustifyContent,
} from '../../../../../UI/Box/box.types';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../hooks/useStyles';
import styleSheet from './pay-with-row.styles';
import { BigNumber } from 'bignumber.js';
import { strings } from '../../../../../../../locales/i18n';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import { isHardwareAccount } from '../../../../../../util/address';
import { Skeleton } from '../../../../../../component-library/components/Skeleton';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../../component-library/components/Icons/Icon';
import useFiatFormatter from '../../../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter';
import {
  ConfirmationRowComponentIDs,
  TransactionPayComponentIDs,
} from '../../../ConfirmationView.testIds';
import { useConfirmationMetricEvents } from '../../../hooks/metrics/useConfirmationMetricEvents';
import { useTransactionPaySelectedFiatPaymentMethod } from '../../../hooks/pay/useTransactionPaySelectedFiatPaymentMethod';
import { TransactionPaymentToken } from '@metamask/transaction-pay-controller';
import PaymentMethodIcon from '../../../../../UI/Ramp/Aggregator/components/PaymentMethodIcon';
import { PaymentType } from '@consensys/on-ramp-sdk';

export function PayWithRow() {
  const navigation = useNavigation();
  const { payToken } = useTransactionPayToken();
  const { isWithdraw } = useTransactionPayWithdraw();
  const requiredTokens = useTransactionPayRequiredTokens();
  const formatFiat = useFiatFormatter({ currency: 'usd' });
  const { styles } = useStyles(styleSheet, {});
  const { setConfirmationMetric } = useConfirmationMetricEvents();
  const selectedFiatPaymentMethod =
    useTransactionPaySelectedFiatPaymentMethod();

  const {
    txParams: { from },
  } = useTransactionMetadataRequest() ?? { txParams: {} };

  const canEdit = !isHardwareAccount(from ?? '');

  const handleClick = useCallback(() => {
    if (!canEdit) return;
    setConfirmationMetric({
      properties: {
        mm_pay_token_list_opened: true,
      },
    });
    navigation.navigate(Routes.CONFIRMATION_PAY_WITH_MODAL);
  }, [canEdit, navigation, setConfirmationMetric]);

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
    if (isWithdraw) {
      return payToken ?? defaultWithdrawToken ?? null;
    }
    return payToken ?? null;
  }, [isWithdraw, payToken, defaultWithdrawToken]);

  // For deposits, show the user's balance of the selected pay token
  const balanceUsdFormatted = useMemo(
    () => formatFiat(new BigNumber(payToken?.balanceUsd ?? '0')),
    [formatFiat, payToken?.balanceUsd],
  );

  if (!displayToken) {
    return <PayWithRowSkeleton />;
  }

  return (
    <TouchableOpacity
      onPress={handleClick}
      disabled={!canEdit}
      testID={ConfirmationRowComponentIDs.PAY_WITH}
    >
      <Box
        flexDirection={FlexDirection.Row}
        alignItems={AlignItems.center}
        justifyContent={JustifyContent.center}
        gap={12}
        style={styles.container}
      >
        {selectedFiatPaymentMethod ? (
          <PayWithFiatPaymentMethodRow
            selectedFiatPaymentMethod={selectedFiatPaymentMethod}
          />
        ) : (
          <PayWithTokenRow
            displayToken={displayToken}
            label={label}
            isWithdraw={isWithdraw}
            balanceUsdFormatted={balanceUsdFormatted}
            canEdit={canEdit}
            from={from ?? ''}
          />
        )}
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
      justifyContent={JustifyContent.center}
      gap={8}
      style={styles.container}
    >
      <Skeleton height={32} width={32} style={styles.skeletonCircle} />
      <Skeleton height={18} width={100} style={styles.skeletonTop} />
      <Skeleton height={18} width={100} style={styles.skeletonTop} />
    </Box>
  );
}

function PayWithFiatPaymentMethodRow({
  selectedFiatPaymentMethod,
}: {
  selectedFiatPaymentMethod: PaymentMethod;
}) {
  const tw = useTailwind();
  return (
    <>
      <Box
        style={tw.style(
          'w-10 h-10 rounded-full bg-background-section items-center justify-center',
        )}
        testID="icon"
      >
        <PaymentMethodIcon
          paymentMethodType={selectedFiatPaymentMethod.icon as PaymentType}
          size={20}
        />
      </Box>
      <Text
        variant={TextVariant.BodyMDMedium}
        color={TextColor.Default}
        testID={TransactionPayComponentIDs.PAY_WITH_BALANCE}
      >
        {selectedFiatPaymentMethod.name}
      </Text>
      <Icon
        name={IconName.ArrowDown}
        size={IconSize.Sm}
        color={IconColor.Alternative}
      />
    </>
  );
}
function PayWithTokenRow({
  displayToken,
  label,
  isWithdraw,
  balanceUsdFormatted,
  canEdit,
  from,
}: {
  displayToken: TransactionPaymentToken;
  label: string;
  isWithdraw: boolean;
  balanceUsdFormatted: string;
  canEdit: boolean;
  from: string;
}) {
  return (
    <>
      <TokenIcon
        address={displayToken.address}
        chainId={displayToken.chainId}
      />
      <Text
        variant={TextVariant.BodyMDMedium}
        color={TextColor.Default}
        testID={TransactionPayComponentIDs.PAY_WITH_SYMBOL}
      >
        {`${label} ${displayToken.symbol}`}
      </Text>
      {/* For deposits, show the user's balance; for withdrawals, no balance needed */}
      {!isWithdraw && (
        <Text
          variant={TextVariant.BodyMDMedium}
          color={TextColor.Alternative}
          testID={TransactionPayComponentIDs.PAY_WITH_BALANCE}
        >
          {balanceUsdFormatted}
        </Text>
      )}
      {canEdit && from && (
        <Icon
          name={IconName.ArrowDown}
          size={IconSize.Sm}
          color={IconColor.Alternative}
        />
      )}
    </>
  );
}
