import React, { useCallback } from 'react';
import { toCaipAssetType } from '@metamask/utils';
import { getNativeTokenAddress } from '@metamask/assets-controllers';
import {
  Box,
  BoxAlignItems,
  Button,
  ButtonSize,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import { useRampNavigation } from '../../../../../UI/Ramp/hooks/useRampNavigation';
import { useAccountTokens } from '../../../hooks/send/useAccountTokens';
import { useTransactionPayRequiredTokens } from '../../../hooks/pay/useTransactionPayData';

export function CustomAmountBuy() {
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

  return (
    <Box alignItems={BoxAlignItems.Center} gap={5}>
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
