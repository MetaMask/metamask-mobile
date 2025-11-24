import React, { useMemo } from 'react';
import { strings } from '../../../../../../../locales/i18n';
import useNavbar from '../../../hooks/ui/useNavbar';
import { CustomAmountInfo } from '../custom-amount-info';
import {
  MUSD_TOKEN,
  MUSD_TOKEN_ADDRESS_BY_CHAIN,
} from '../../../../../UI/Earn/constants/musd';
import { useAddToken } from '../../../hooks/tokens/useAddToken';
import { useRoute, RouteProp } from '@react-navigation/native';
import {
  areValidAllowedPaymentTokens,
  MusdConversionConfig,
} from '../../../../../UI/Earn/hooks/useMusdConversion';
import { CHAIN_IDS } from '@metamask/transaction-controller';

export const MusdConversionInfo = () => {
  const route =
    useRoute<RouteProp<Record<string, MusdConversionConfig>, string>>();
  // TEMP: Will be brought back in subsequent PR.
  // const preferredPaymentToken = route.params?.preferredPaymentToken;
  const outputChainId = route.params?.outputChainId ?? CHAIN_IDS.MAINNET;
  const rawAllowedPaymentTokens = route.params?.allowedPaymentTokens;

  const allowedPaymentTokens = useMemo(() => {
    if (!rawAllowedPaymentTokens) {
      // No allowlist provided - allow all tokens
      return undefined;
    }

    if (!areValidAllowedPaymentTokens(rawAllowedPaymentTokens)) {
      console.warn(
        'Invalid allowedPaymentTokens structure in route params. ' +
          'Expected Record<Hex, Hex[]>. Allowing all tokens.',
        rawAllowedPaymentTokens,
      );
      return undefined;
    }

    return rawAllowedPaymentTokens;
  }, [rawAllowedPaymentTokens]);

  useNavbar(strings('earn.musd_conversion.earn_rewards_with'));

  const { decimals, name, symbol } = MUSD_TOKEN;

  const tokenToAddAddress =
    MUSD_TOKEN_ADDRESS_BY_CHAIN[outputChainId] ??
    MUSD_TOKEN_ADDRESS_BY_CHAIN[CHAIN_IDS.MAINNET];

  useAddToken({
    chainId: outputChainId,
    decimals,
    name,
    symbol,
    tokenAddress: tokenToAddAddress,
  });

  if (!outputChainId) {
    return null;
  }

  return (
    <CustomAmountInfo
      allowedPaymentTokens={allowedPaymentTokens}
      // TEMP: Will be brought back in subsequent PR.
      // preferredPaymentToken={preferredPaymentToken}
    />
  );
};
