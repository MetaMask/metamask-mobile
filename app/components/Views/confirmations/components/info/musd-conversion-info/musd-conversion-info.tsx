import React, { useMemo } from 'react';
import { strings } from '../../../../../../../locales/i18n';
import useNavbar from '../../../hooks/ui/useNavbar';
import { CustomAmountInfo } from '../custom-amount-info';
import { MUSD_TOKEN } from '../../../constants/musd';
import { useAddToken } from '../../../hooks/tokens/useAddToken';
import { Hex } from '@metamask/utils';
import {
  ETHEREUM_MAINNET_CHAIN_ID,
  MUSD_CONVERTIBLE_STABLECOINS_ETHEREUM,
} from '../../../../../UI/Earn/constants/musd';
import { useRoute, RouteProp } from '@react-navigation/native';

interface MusdConversionParams {
  preferredPaymentToken?: {
    address: Hex;
    chainId: Hex;
  };
}

export function MusdConversionInfo() {
  useNavbar(strings('earn.musd.title'));

  const route =
    useRoute<RouteProp<Record<string, MusdConversionParams>, string>>();
  const preferredPaymentToken = route.params?.preferredPaymentToken;

  useAddToken({
    chainId: MUSD_TOKEN.chainId,
    decimals: MUSD_TOKEN.decimals,
    name: MUSD_TOKEN.name,
    symbol: MUSD_TOKEN.symbol,
    tokenAddress: MUSD_TOKEN.address as Hex,
  });

  // Restrict token selection to Ethereum mainnet stablecoins (USDC, USDT, DAI)
  const allowedTokenAddresses = useMemo(
    () => ({
      [ETHEREUM_MAINNET_CHAIN_ID]: MUSD_CONVERTIBLE_STABLECOINS_ETHEREUM,
    }),
    [],
  );

  // TODO: Fix broken "Transaction fee" tooltip (currently empty tooltip bottom-sheet).
  return (
    <CustomAmountInfo
      allowedTokenAddresses={allowedTokenAddresses}
      preferredPaymentToken={preferredPaymentToken}
    />
  );
}
