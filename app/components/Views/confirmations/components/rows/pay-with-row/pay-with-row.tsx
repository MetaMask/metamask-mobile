import React, { useCallback, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import { PaymentType } from '@consensys/on-ramp-sdk';
import Routes from '../../../../../../constants/navigation/Routes';
import { TokenIcon } from '../../token-icon';
import { useTransactionPayToken } from '../../../hooks/pay/useTransactionPayToken';
import { useTransactionPayWithdraw } from '../../../hooks/pay/useTransactionPayWithdraw';
import { useTransactionPayRequiredTokens } from '../../../hooks/pay/useTransactionPayData';
import { useTransactionPaySelectedFiatPaymentMethod } from '../../../hooks/pay/useTransactionPaySelectedFiatPaymentMethod';
import { TouchableOpacity } from 'react-native';
import { Box } from '../../../../../UI/Box/Box';
import {
  AlignItems,
  FlexDirection,
  JustifyContent,
} from '../../../../../UI/Box/box.types';
import {
  FontWeight,
  Skeleton,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useStyles } from '../../../../../hooks/useStyles';
import styleSheet from './pay-with-row.styles';
import { BigNumber } from 'bignumber.js';
import { strings } from '../../../../../../../locales/i18n';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import { isHardwareAccount } from '../../../../../../util/address';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../../component-library/components/Icons/Icon';
import PaymentMethodIcon from '../../../../../UI/Ramp/Aggregator/components/PaymentMethodIcon';
import useFiatFormatter from '../../../../../UI/SimulationDetails/FiatDisplay/useFiatFormatter';
import {
  ConfirmationRowComponentIDs,
  TransactionPayComponentIDs,
} from '../../../ConfirmationView.testIds';
import { useConfirmationMetricEvents } from '../../../hooks/metrics/useConfirmationMetricEvents';
import { type PaymentMethod } from '@metamask/ramps-controller';
export function PayWithRow() {
  const navigation = useNavigation();
  const { payToken } = useTransactionPayToken();
  const { isWithdraw } = useTransactionPayWithdraw();
  const requiredTokens = useTransactionPayRequiredTokens();
  const selectedFiatPaymentMethod =
    useTransactionPaySelectedFiatPaymentMethod();
  const formatFiat = useFiatFormatter({ currency: 'usd' });
  const { styles } = useStyles(styleSheet, {});
  const { setConfirmationMetric } = useConfirmationMetricEvents();

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
          {canEdit && from && (
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
