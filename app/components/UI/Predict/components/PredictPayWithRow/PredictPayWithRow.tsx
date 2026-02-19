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
import { strings } from '../../../../../../locales/i18n';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import Routes from '../../../../../constants/navigation/Routes';
import { useTransactionPayToken } from '../../../../Views/confirmations/hooks/pay/useTransactionPayToken';
import { useTransactionMetadataRequest } from '../../../../Views/confirmations/hooks/transactions/useTransactionMetadataRequest';
import { TokenIcon } from '../../../../Views/confirmations/components/token-icon';
import { isHardwareAccount } from '../../../../../util/address';
import { usePredictPaymentToken } from '../../hooks/usePredictPaymentToken';

export function PredictPayWithRow() {
  const navigation = useNavigation();
  const { payToken } = useTransactionPayToken();
  const transactionMeta = useTransactionMetadataRequest();
  const from = transactionMeta?.txParams?.from;
  const canEdit = !isHardwareAccount((from as string) ?? '');
  const { isPredictBalanceSelected } = usePredictPaymentToken();

  const handlePress = useCallback(() => {
    if (!canEdit) return;
    navigation.navigate(Routes.CONFIRMATION_PAY_WITH_MODAL);
  }, [canEdit, navigation]);

  const label = strings('confirm.label.pay_with');
  const displaySymbol = isPredictBalanceSelected
    ? 'Predict balance'
    : (payToken?.symbol ?? '');

  return (
    <TouchableOpacity onPress={handlePress} disabled={!canEdit}>
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
        gap={3}
        twClassName="rounded-lg bg-background-alternative px-4 py-3"
      >
        {!isPredictBalanceSelected && payToken && (
          <TokenIcon
            address={payToken.address as Hex}
            chainId={payToken.chainId as Hex}
          />
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
  );
}
