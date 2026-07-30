import React, { useCallback } from 'react';
import {
  TransactionType,
  hasTransactionType,
} from '@metamask/transaction-controller';
import { toCaipAssetType } from '@metamask/utils';
import { getNativeTokenAddress } from '@metamask/assets-controllers';
import {
  Button,
  ButtonSize,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import { Box } from '../../../../../UI/Box/Box';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import { AlignItems } from '../../../../../UI/Box/box.types';
import { strings } from '../../../../../../../locales/i18n';
import { useRampNavigation } from '../../../../../UI/Ramp/hooks/useRampNavigation';
import { useAccountTokens } from '../../../hooks/send/useAccountTokens';
import { useTransactionPayRequiredTokens } from '../../../hooks/pay/useTransactionPayData';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';

export function CustomAmountBuy() {
  const transactionMeta = useTransactionMetadataRequest();
  const tokens = useAccountTokens({ includeNoBalance: true });
  const requiredTokens = useTransactionPayRequiredTokens();

  const primaryRequiredToken = requiredTokens.find(
    (token) => token.address !== getNativeTokenAddress(token.chainId),
  );

  const asset = tokens.find(
    (token) =>
      token.address?.toLowerCase() ===
        primaryRequiredToken?.address.toLowerCase() &&
      token.chainId === primaryRequiredToken?.chainId,
  );

  const assetId = toCaipAssetType(
    'eip155',
    Number(primaryRequiredToken?.chainId ?? '0x0').toString(),
    'erc20',
    asset?.assetId ?? '0x0',
  );

  const { goToBuy } = useRampNavigation();

  const handleBuyPress = useCallback(() => {
    goToBuy({ assetId });
  }, [assetId, goToBuy]);

  let message: string | undefined;

  if (hasTransactionType(transactionMeta, [TransactionType.perpsDeposit])) {
    message = strings('confirm.custom_amount.buy_perps');
  }

  if (hasTransactionType(transactionMeta, [TransactionType.predictDeposit])) {
    message = strings('confirm.custom_amount.buy_predict');
  }

  return (
    <Box alignItems={AlignItems.center} gap={20}>
      {message && (
        <Text variant={TextVariant.BodySM} color={TextColor.Error}>
          {message}
        </Text>
      )}
      <Button
        variant={ButtonVariant.Primary}
        onPress={handleBuyPress}
        isFullWidth
        size={ButtonSize.Lg}
      >
        {strings('confirm.custom_amount.buy_button')}
      </Button>
    </Box>
  );
}
