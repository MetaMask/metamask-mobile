import React, { useCallback } from 'react';
import { TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { Hex } from '@metamask/utils';
import { TransactionType } from '@metamask/transaction-controller';
import { strings } from '../../../../../../../../locales/i18n';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../../../component-library/components/Icons/Icon';
import Routes from '../../../../../../../constants/navigation/Routes';
import { useTransactionPayToken } from '../../../../../../Views/confirmations/hooks/pay/useTransactionPayToken';
import { useTransactionMetadataRequest } from '../../../../../../Views/confirmations/hooks/transactions/useTransactionMetadataRequest';
import { hasTransactionType } from '../../../../../../Views/confirmations/utils/transaction';
import { TokenIcon } from '../../../../../../Views/confirmations/components/token-icon';
import { isHardwareAccount } from '../../../../../../../util/address';
import { POLYGON_USDCE } from '../../../../../../Views/confirmations/constants/predict';
import { usePredictPaymentToken } from '../../../../hooks/usePredictPaymentToken';
import { PREDICT_BALANCE_CHAIN_ID } from '../../../../constants/transactions';
import { usePredictDefaultPaymentToken } from '../../hooks/usePredictDefaultPaymentToken';

interface PredictPayWithRowProps {
  disabled?: boolean;
}

export function PredictPayWithRow({
  disabled = false,
}: PredictPayWithRowProps) {
  usePredictDefaultPaymentToken();
  const navigation = useNavigation();
  const { payToken } = useTransactionPayToken();
  const transactionMeta = useTransactionMetadataRequest();
  const from = transactionMeta?.txParams?.from;
  const isPredictDepositAndOrder = hasTransactionType(transactionMeta, [
    TransactionType.predictDepositAndOrder,
  ]);
  const canEdit =
    !isHardwareAccount((from as string) ?? '') &&
    !disabled &&
    isPredictDepositAndOrder;
  const { isPredictBalanceSelected, selectedPaymentToken } =
    usePredictPaymentToken();

  const showPredictBalance = isPredictBalanceSelected || !payToken;

  const handlePress = useCallback(() => {
    if (!canEdit) return;
    navigation.navigate(Routes.CONFIRMATION_PAY_WITH_MODAL);
  }, [canEdit, navigation]);

  const label = strings('confirm.label.pay_with');
  const displaySymbol = showPredictBalance
    ? 'Predict balance'
    : (selectedPaymentToken?.symbol ?? payToken?.symbol ?? '');
  const tokenIconAddress = showPredictBalance
    ? POLYGON_USDCE.address
    : (payToken?.address as Hex | undefined);
  const tokenIconChainId = showPredictBalance
    ? PREDICT_BALANCE_CHAIN_ID
    : (payToken?.chainId as Hex | undefined);

  return (
    <Box
      flexDirection={BoxFlexDirection.Column}
      alignItems={BoxAlignItems.Center}
      gap={3}
    >
      <TouchableOpacity onPress={handlePress} disabled={!canEdit}>
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Center}
          twClassName={`rounded-full py-2 pl-[9px] pr-[16px] mt-2 ${!canEdit ? '' : 'bg-muted'} mx-auto`}
          gap={3}
        >
          {tokenIconAddress && tokenIconChainId && (
            <TokenIcon address={tokenIconAddress} chainId={tokenIconChainId} />
          )}
          <Text variant={TextVariant.BodyMd} color={TextColor.TextDefault}>
            {`${label} ${displaySymbol}`}
          </Text>
          {canEdit && (
            <Icon
              name={IconName.ArrowDown}
              size={IconSize.Sm}
              color={IconColor.Alternative}
            />
          )}
        </Box>
      </TouchableOpacity>
      {!isPredictBalanceSelected && (
        <Text
          variant={TextVariant.BodySm}
          twClassName="font-medium"
          color={TextColor.TextDefault}
        >
          {strings('predict.order.predict_balance_first')}
        </Text>
      )}
    </Box>
  );
}
