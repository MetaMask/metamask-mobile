import React, { useEffect } from 'react';
import { useParams } from '../../../../../../util/navigation/navUtils';
import {
  MUSD_TOKEN,
  MUSD_TOKEN_ADDRESS_BY_CHAIN,
} from '../../../../../UI/Earn/constants/musd';
import { useAddToken } from '../../../hooks/tokens/useAddToken';
import { CustomAmountInfo } from '../custom-amount-info';
import { useMusdConversionNavbar } from '../../../../../UI/Earn/hooks/useMusdConversionNavbar';
import { useMusdConversionQuoteTrace } from '../../../../../UI/Earn/hooks/useMusdConversionQuoteTrace';
import { endTrace, TraceName } from '../../../../../../util/trace';
import { Hex } from '@metamask/utils';

interface MusdConversionConfirmationParams {
  preferredPaymentToken: {
    address: Hex;
    chainId: Hex;
  };
}

export const MusdConversionInfo = () => {
  const { preferredPaymentToken } =
    useParams<Partial<MusdConversionConfirmationParams>>();

  if (!preferredPaymentToken?.chainId) {
    throw new Error('Preferred payment token chainId is required');
  }

  const { decimals, name, symbol } = MUSD_TOKEN;

  const tokenToAddAddress =
    MUSD_TOKEN_ADDRESS_BY_CHAIN?.[preferredPaymentToken.chainId];

  if (!tokenToAddAddress) {
    throw new Error(
      `mUSD token address not found for chain ID: ${preferredPaymentToken.chainId}`,
    );
  }

  useMusdConversionNavbar();

  const { startQuoteTrace } = useMusdConversionQuoteTrace();

  // End navigation trace on first paint
  useEffect(() => {
    endTrace({
      name: TraceName.MusdConversionNavigation,
      data: {
        chainId: preferredPaymentToken.chainId,
      },
    });
  }, [preferredPaymentToken.chainId]);

  useAddToken({
    chainId: preferredPaymentToken.chainId,
    decimals,
    name,
    symbol,
    tokenAddress: tokenToAddAddress,
  });

  return (
    <CustomAmountInfo
      preferredToken={preferredPaymentToken}
      hidePayTokenAmount
      hasMax
      onAmountSubmit={startQuoteTrace}
    />
  );
};
