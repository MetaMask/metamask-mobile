import React, { useMemo } from 'react';
import { strings } from '../../../../../../../locales/i18n';
import useNavbar from '../../../hooks/ui/useNavbar';
import { CustomAmountInfo } from '../custom-amount-info';
import { MUSD_TOKEN } from '../../../constants/musd';
import { useAddToken } from '../../../hooks/tokens/useAddToken';
import { Hex } from '@metamask/utils';
import { useRoute, RouteProp } from '@react-navigation/native';
import {
  TokenConversionConfig,
  isValidAllowedTokenAddresses,
} from '../../../../../UI/Earn/hooks/useEvmTokenConversion';

export const EvmTokenConversionInfo = () => {
  const route =
    useRoute<RouteProp<Record<string, TokenConversionConfig>, string>>();
  const preferredPaymentToken = route.params?.preferredPaymentToken;
  const outputTokenInfo = route.params?.outputToken;
  const rawAllowedTokenAddresses = route.params?.allowedTokenAddresses;

  const allowedTokenAddresses = useMemo(() => {
    if (!rawAllowedTokenAddresses) {
      // No allowlist provided - allow all tokens
      return undefined;
    }

    if (!isValidAllowedTokenAddresses(rawAllowedTokenAddresses)) {
      console.warn(
        'Invalid allowedTokenAddresses structure in route params. ' +
          'Expected Record<Hex, Hex[]>. Allowing all tokens.',
        rawAllowedTokenAddresses,
      );
      return undefined;
    }

    return rawAllowedTokenAddresses;
  }, [rawAllowedTokenAddresses]);

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

  // TODO: Fix broken "Transaction fee" tooltip (currently empty tooltip bottom-sheet).
  return (
    <CustomAmountInfo
      allowedTokenAddresses={allowedTokenAddresses}
      preferredPaymentToken={preferredPaymentToken}
    />
  );
};
