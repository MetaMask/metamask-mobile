import React from 'react';
import { strings } from '../../../../../../../locales/i18n';
import useNavbar from '../../../hooks/ui/useNavbar';
import { CustomAmountInfo } from '../custom-amount-info';
import {
  MUSD_TOKEN,
  MUSD_TOKEN_ADDRESS_BY_CHAIN,
} from '../../../../../UI/Earn/constants/musd';
import { useAddToken } from '../../../hooks/tokens/useAddToken';
import { MusdConversionConfig } from '../../../../../UI/Earn/hooks/useMusdConversion';
import { useParams } from '../../../../../../util/navigation/navUtils';
import { CHAIN_IDS } from '@metamask/transaction-controller';

export const MusdConversionInfo = () => {
  const { outputChainId, preferredPaymentToken } =
    useParams<MusdConversionConfig>({
      outputChainId: CHAIN_IDS.MAINNET,
    });

  useNavbar(strings('earn.musd_conversion.earn_rewards_with'));

  const { decimals, name, symbol } = MUSD_TOKEN;

  const tokenToAddAddress = MUSD_TOKEN_ADDRESS_BY_CHAIN[outputChainId];

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
