import React, { useEffect, useMemo } from 'react';
import { strings } from '../../../../../../../locales/i18n';
import useNavbar from '../../../hooks/ui/useNavbar';
import { CustomAmountInfo } from '../custom-amount-info';
import {
  MUSD_TOKEN,
  MUSD_TOKEN_ADDRESS_BY_CHAIN,
} from '../../../../../UI/Earn/constants/musd';
import { useAddToken } from '../../../hooks/tokens/useAddToken';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import {
  areValidAllowedPaymentTokens,
  MusdConversionConfig,
} from '../../../../../UI/Earn/hooks/useMusdConversion';

export const MusdConversionInfo = () => {
  const route =
    useRoute<RouteProp<Record<string, MusdConversionConfig>, string>>();
  const navigation = useNavigation();
  // TEMP: Will be brought back in subsequent PR.
  // const preferredPaymentToken = route.params?.preferredPaymentToken;
  const outputChainId = route.params?.outputChainId;
  const rawAllowedPaymentTokens = route.params?.allowedPaymentTokens;

  useEffect(() => {
    if (!outputChainId) {
      console.error(
        '[mUSD Conversion] outputChainId is required but was not provided in route params. Navigating back.',
      );
      navigation.goBack();
    }
  }, [outputChainId, navigation]);

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

  useAddToken({
    chainId: outputChainId,
    decimals,
    name,
    symbol,
    tokenAddress: MUSD_TOKEN_ADDRESS_BY_CHAIN[outputChainId],
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
