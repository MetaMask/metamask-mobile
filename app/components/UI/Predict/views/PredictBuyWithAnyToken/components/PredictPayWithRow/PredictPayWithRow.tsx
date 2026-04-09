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
import { strings } from '../../../../../../../../locales/i18n';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../../../component-library/components/Icons/Icon';
import Routes from '../../../../../../../constants/navigation/Routes';
import { useTransactionPayToken } from '../../../../../../Views/confirmations/hooks/pay/useTransactionPayToken';
import { useTransactionMetadataRequest } from '../../../../../../Views/confirmations/hooks/transactions/useTransactionMetadataRequest';
import {
  TokenIcon,
  TokenIconVariant,
} from '../../../../../../Views/confirmations/components/token-icon';
import { isHardwareAccount } from '../../../../../../../util/address';
import { POLYGON_USDCE } from '../../../../../../Views/confirmations/constants/predict';
import { usePredictPaymentToken } from '../../../../hooks/usePredictPaymentToken';
import { PREDICT_BALANCE_CHAIN_ID } from '../../../../constants/transactions';

type PredictPayWithRowVariant = 'pill' | 'row';

interface PredictPayWithRowProps {
  disabled?: boolean;
  chevronRight?: boolean;
  variant?: PredictPayWithRowVariant;
}

export function PredictPayWithRow({
  disabled = false,
  chevronRight = false,
  variant = 'pill',
}: PredictPayWithRowProps) {
  const navigation = useNavigation();
  const { payToken } = useTransactionPayToken();
  const transactionMeta = useTransactionMetadataRequest();
  const from = transactionMeta?.txParams?.from;
  const canEdit = !isHardwareAccount((from as string) ?? '') && !disabled;
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

  if (variant === 'row') {
    return (
      <TouchableOpacity onPress={handlePress} disabled={!canEdit}>
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Between}
          twClassName="px-4 pt-4 pb-2"
        >
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            twClassName="font-medium"
          >
            {label}
          </Text>
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            gap={2}
          >
            {tokenIconAddress && tokenIconChainId && (
              <TokenIcon
                address={tokenIconAddress}
                chainId={tokenIconChainId}
                variant={TokenIconVariant.Row}
              />
            )}
            <Text variant={TextVariant.BodyMd} color={TextColor.TextDefault}>
              {displaySymbol}
            </Text>
            {canEdit && (
              <Icon
                name={IconName.ArrowRight}
                size={IconSize.Sm}
                color={IconColor.Alternative}
              />
            )}
          </Box>
        </Box>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity onPress={handlePress} disabled={!canEdit}>
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
        twClassName={`rounded-full py-2 pl-[9px] pr-[16px] mt-2 ${disabled ? '' : 'bg-muted'}`}
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
            name={chevronRight ? IconName.ArrowRight : IconName.ArrowDown}
            size={IconSize.Sm}
            color={IconColor.Alternative}
          />
        )}
      </Box>
    </TouchableOpacity>
  );
}
