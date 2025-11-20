import React, { useEffect, useMemo } from 'react';
import { strings } from '../../../../../../../locales/i18n';
import useNavbar from '../../../hooks/ui/useNavbar';
import { CustomAmountInfo } from '../custom-amount-info';
import { MUSD_TOKEN_MAINNET } from '../../../constants/musd';
import { useAddToken } from '../../../hooks/tokens/useAddToken';
import { Hex } from '@metamask/utils';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import {
  MusdConversionConfig,
  areValidAllowedPaymentTokens,
} from '../../../../../UI/Earn/hooks/useMusdConversion';

export const MusdConversionInfo = () => {
  const route =
    useRoute<RouteProp<Record<string, MusdConversionConfig>, string>>();
  const navigation = useNavigation();
  const preferredPaymentToken = route.params?.preferredPaymentToken;
  const outputTokenInfo = route.params?.outputToken;
  const rawAllowedPaymentTokens = route.params?.allowedPaymentTokens;

  useEffect(() => {
    if (!outputTokenInfo) {
      console.error(
        '[Token Conversion] outputToken is required but was not provided in route params. Navigating back.',
      );
      navigation.goBack();
    }
  }, [outputTokenInfo, navigation]);

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

  const tokenToAdd = outputTokenInfo || MUSD_TOKEN_MAINNET;

  useNavbar(
    strings('earn.musd_conversion.earn_rewards_with', {
      tokenSymbol: MUSD_TOKEN_MAINNET.symbol,
    }),
  );

  useAddToken({
    chainId: tokenToAdd.chainId as Hex,
    decimals: tokenToAdd.decimals,
    name: tokenToAdd.name,
    symbol: tokenToAdd.symbol,
    tokenAddress: tokenToAdd.address as Hex,
  });

  if (!outputTokenInfo) {
    return null;
  }

  return (
    <CustomAmountInfo
      allowedPaymentTokens={allowedPaymentTokens}
      preferredPaymentToken={preferredPaymentToken}
    />
  );
};
