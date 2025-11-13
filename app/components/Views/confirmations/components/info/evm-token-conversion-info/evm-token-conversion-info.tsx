import React, { useMemo } from 'react';
import { strings } from '../../../../../../../locales/i18n';
import useNavbar from '../../../hooks/ui/useNavbar';
import { CustomAmountInfo } from '../custom-amount-info';
import { MUSD_TOKEN } from '../../../constants/musd';
import { useAddToken } from '../../../hooks/tokens/useAddToken';
import { Hex } from '@metamask/utils';
import {
  CONVERTIBLE_STABLECOINS_BY_CHAIN,
  SUPPORTED_CONVERSION_CHAIN_IDS,
} from '../../../../../UI/Earn/constants/musd';
import { useRoute, RouteProp } from '@react-navigation/native';
import { TokenConversionConfig } from '../../../../../UI/Earn/hooks/useEvmTokenConversion';

export function EvmTokenConversionInfo() {
  const route =
    useRoute<RouteProp<Record<string, TokenConversionConfig>, string>>();
  const preferredPaymentToken = route.params?.preferredPaymentToken;
  const outputTokenInfo = route.params?.outputToken;

  // Use provided output token info or fall back to mUSD.
  const tokenToAdd = outputTokenInfo || MUSD_TOKEN;

  useNavbar(
    strings('earn.token_conversion.title', {
      tokenSymbol: outputTokenInfo?.symbol || MUSD_TOKEN.symbol,
    }),
  );

  useAddToken({
    chainId: tokenToAdd.chainId as Hex,
    decimals: tokenToAdd.decimals,
    name: tokenToAdd.name,
    symbol: tokenToAdd.symbol,
    tokenAddress: tokenToAdd.address as Hex,
  });

  // Restrict token selection to supported chains and their stablecoins
  const allowedTokenAddresses = useMemo(() => {
    const allowedAddresses: Record<Hex, Hex[]> = {};
    for (const chainId of SUPPORTED_CONVERSION_CHAIN_IDS) {
      allowedAddresses[chainId] = CONVERTIBLE_STABLECOINS_BY_CHAIN[chainId];
    }
    return allowedAddresses;
  }, []);

  // TODO: Fix broken "Transaction fee" tooltip (currently empty tooltip bottom-sheet).
  return (
    <CustomAmountInfo
      allowedTokenAddresses={allowedTokenAddresses}
      preferredPaymentToken={preferredPaymentToken}
    />
  );
}
