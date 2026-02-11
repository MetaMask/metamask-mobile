import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { ScrollView } from 'react-native';
import { useSelector } from 'react-redux';
import BigNumber from 'bignumber.js';
import { Hex, CaipChainId } from '@metamask/utils';
import { toEvmCaipChainId } from '@metamask/multichain-network-controller';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

import BottomSheet, {
  BottomSheetRef,
} from '../../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import Avatar, {
  AvatarSize,
  AvatarVariant,
} from '../../../../../../component-library/components/Avatars/Avatar';
import { getNetworkImageSource } from '../../../../../../util/networks';
import { strings } from '../../../../../../../locales/i18n';
import { MUSD_TOKEN } from '../../../constants/musd';
import { selectNetworkConfigurations } from '../../../../../../selectors/networkController';
import { useMusdBalance } from '../../../hooks/useMusdBalance';

export interface MusdBalancesByNetworkRow {
  chainId: Hex;
  caipChainId: CaipChainId;
  networkName: string;
  tokenBalance: string;
  fiatBalanceFormatted?: string;
}

const MusdBalancesByNetworkBottomSheet = () => {
  const tw = useTailwind();
  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const networkConfigurations = useSelector(selectNetworkConfigurations);

  const {
    tokenBalanceByChain,
    fiatBalanceByChain,
    fiatBalanceFormattedByChain,
  } = useMusdBalance();

  const rows = useMemo(() => {
    /**
     * Sort networks by largest fiat balance first;
     * if fiat is tied/unavailable (e.g. both 0), fall back to token balance as a deterministic tie-breaker.
     */
    const chainIdsByBalanceDesc = (
      Object.keys(tokenBalanceByChain) as Hex[]
    ).sort((chainIdA, chainIdB) => {
      const fiatA = new BigNumber(fiatBalanceByChain[chainIdA] ?? 0);
      const fiatB = new BigNumber(fiatBalanceByChain[chainIdB] ?? 0);
      const fiatComparison = fiatB.comparedTo(fiatA);
      if (fiatComparison) {
        return fiatComparison;
      }

      const tokenA = new BigNumber(tokenBalanceByChain[chainIdA] ?? 0);
      const tokenB = new BigNumber(tokenBalanceByChain[chainIdB] ?? 0);
      return tokenB.comparedTo(tokenA) || 0;
    });

    return chainIdsByBalanceDesc.map((chainId) => ({
      chainId,
      caipChainId: toEvmCaipChainId(chainId),
      networkName: networkConfigurations?.[chainId]?.name ?? chainId,
      tokenBalance: tokenBalanceByChain[chainId],
      fiatBalanceFormatted: fiatBalanceFormattedByChain[chainId],
    }));
  }, [
    fiatBalanceByChain,
    fiatBalanceFormattedByChain,
    networkConfigurations,
    tokenBalanceByChain,
  ]);

  useEffect(() => {
    bottomSheetRef.current?.onOpenBottomSheet();
  }, []);

  const handleClose = useCallback(() => {
    bottomSheetRef.current?.onCloseBottomSheet();
  }, []);

  return (
    <BottomSheet
      ref={bottomSheetRef}
      testID="musd-balances-by-network-bottom-sheet"
    >
      <BottomSheetHeader onClose={handleClose} />
      <Box twClassName="px-4 pb-6">
        <Text variant={TextVariant.BodyLg} twClassName="text-center mb-8">
          {strings('earn.musd_conversion.balance_breakdown_title')}
        </Text>

        <ScrollView style={tw.style('flex-grow-0')}>
          <Box twClassName="gap-2">
            {rows.map((row) => (
              <Box
                key={row.caipChainId}
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                justifyContent={BoxJustifyContent.Between}
                twClassName="rounded-xl bg-muted px-4 py-3"
              >
                <Box
                  flexDirection={BoxFlexDirection.Row}
                  alignItems={BoxAlignItems.Center}
                  twClassName="gap-3 flex-1"
                >
                  <Avatar
                    variant={AvatarVariant.Network}
                    size={AvatarSize.Sm}
                    name={row.networkName}
                    imageSource={getNetworkImageSource({
                      chainId: row.chainId,
                    })}
                  />
                  <Text
                    variant={TextVariant.BodyMd}
                    twClassName="flex-1 font-medium"
                  >
                    {row.networkName}
                  </Text>
                </Box>

                <Box twClassName="items-end">
                  <Text variant={TextVariant.BodyMd} twClassName="font-medium">
                    {strings(
                      'earn.musd_conversion.balance_amount_with_symbol',
                      {
                        amount: new BigNumber(row.tokenBalance).toFixed(2),
                        symbol: MUSD_TOKEN.symbol,
                      },
                    )}
                  </Text>
                  <Text
                    variant={TextVariant.BodySm}
                    color={TextColor.TextAlternative}
                  >
                    {row.fiatBalanceFormatted ??
                      strings('earn.musd_conversion.balance_fiat_unavailable')}
                  </Text>
                </Box>
              </Box>
            ))}
          </Box>
        </ScrollView>
      </Box>
    </BottomSheet>
  );
};

export default MusdBalancesByNetworkBottomSheet;
