import React from 'react';
import { CustomAmountInfo } from '../custom-amount-info';
import {
  MUSD_TOKEN,
  MUSD_TOKEN_ADDRESS_BY_CHAIN,
} from '../../../../../UI/Earn/constants/musd';
import { useAddToken } from '../../../hooks/tokens/useAddToken';
import { MusdConversionConfig } from '../../../../../UI/Earn/hooks/useMusdConversion';
import { useParams } from '../../../../../../util/navigation/navUtils';

export const MusdConversionInfo = () => {
  const { outputChainId, preferredPaymentToken } =
    useParams<MusdConversionConfig>();

  const { decimals, name, symbol } = MUSD_TOKEN;

  const tokenToAddAddress = MUSD_TOKEN_ADDRESS_BY_CHAIN?.[outputChainId];

  if (!tokenToAddAddress) {
    throw new Error(
      `mUSD token address not found for chain ID: ${outputChainId}`,
    );
  }

  useAddToken({
    chainId: outputChainId,
    decimals,
    name,
    symbol,
    tokenAddress: tokenToAddAddress,
  });

  return <CustomAmountInfo preferredToken={preferredPaymentToken} />;
};
