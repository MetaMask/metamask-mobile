import React, { useCallback, useMemo, useState } from 'react';
import { Pressable } from 'react-native';
import { useSelector } from 'react-redux';
import BigNumber from 'bignumber.js';
import { Hex } from '@metamask/utils';
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

import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../../component-library/components/Icons/Icon';
import { strings } from '../../../../../../../locales/i18n';
import { selectNetworkConfigurations } from '../../../../../../selectors/networkController';
import { useMusdBalance } from '../../../hooks/useMusdBalance';
import NetworkAvatars from '../../../../Rewards/components/Settings/NetworkAvatars';
import { MusdBalancesByNetworkBottomSheet } from './MusdBalancesByNetworkBottomSheet';

const DEFAULT_MAX_VISIBLE_NETWORKS = 3;

export interface MusdBalancesByNetworkProps {
  maxVisibleNetworks?: number;
  testID?: string;
}

const MusdBalancesByNetwork = ({
  maxVisibleNetworks = DEFAULT_MAX_VISIBLE_NETWORKS,
  testID,
}: MusdBalancesByNetworkProps) => {
  const tw = useTailwind();
  const networkConfigurations = useSelector(selectNetworkConfigurations);
  const [isBottomSheetVisible, setIsBottomSheetVisible] = useState(false);

  const {
    hasMusdBalanceOnAnyChain,
    tokenBalanceByChain,
    fiatBalanceByChain,
    fiatBalanceFormattedByChain,
    tokenBalanceAggregated,
    fiatBalanceAggregatedFormatted,
  } = useMusdBalance();

  const chainIdsWithMusdBalance = useMemo(() => {
    const chainIds = Object.keys(tokenBalanceByChain) as Hex[];

    return chainIds.sort((chainIdA, chainIdB) => {
      const fiatA = new BigNumber(fiatBalanceByChain[chainIdA] ?? 0);
      const fiatB = new BigNumber(fiatBalanceByChain[chainIdB] ?? 0);
      const fiatComparison = fiatB.comparedTo(fiatA);
      if (fiatComparison !== 0) {
        return fiatComparison;
      }

      const tokenA = new BigNumber(tokenBalanceByChain[chainIdA] ?? 0);
      const tokenB = new BigNumber(tokenBalanceByChain[chainIdB] ?? 0);
      return tokenB.comparedTo(tokenA);
    });
  }, [fiatBalanceByChain, tokenBalanceByChain]);

  const orderedEvmScopes = useMemo(
    () =>
      chainIdsWithMusdBalance.map((chainId) =>
        toEvmCaipChainId(chainId as `0x${string}`),
      ),
    [chainIdsWithMusdBalance],
  );

  const breakdownRows = useMemo(
    () =>
      chainIdsWithMusdBalance.map((chainId) => ({
        chainId,
        caipChainId: toEvmCaipChainId(chainId as `0x${string}`),
        networkName: networkConfigurations?.[chainId]?.name ?? String(chainId),
        tokenBalance: tokenBalanceByChain[chainId],
        fiatBalanceFormatted: fiatBalanceFormattedByChain[chainId],
      })),
    [
      chainIdsWithMusdBalance,
      fiatBalanceFormattedByChain,
      networkConfigurations,
      tokenBalanceByChain,
    ],
  );

  const handleOpen = useCallback(() => {
    setIsBottomSheetVisible(true);
  }, []);

  const handleClose = useCallback(() => {
    setIsBottomSheetVisible(false);
  }, []);

  if (!hasMusdBalanceOnAnyChain || chainIdsWithMusdBalance.length === 0) {
    return null;
  }

  const primaryValueText =
    fiatBalanceAggregatedFormatted ??
    strings('earn.musd_conversion.balance_amount', {
      amount: tokenBalanceAggregated,
    });

  return (
    <>
      <Pressable
        onPress={handleOpen}
        style={({ pressed }) =>
          tw.style(
            'w-full rounded-xl bg-muted px-4 py-3',
            pressed && 'bg-pressed',
          )
        }
        accessibilityRole="button"
        testID={testID}
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Between}
          twClassName="gap-3"
        >
          <Box twClassName="flex-1">
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              {strings('earn.musd_conversion.balance_breakdown_title')}
            </Text>
            <Text variant={TextVariant.BodyMd} twClassName="font-medium">
              {primaryValueText}
            </Text>
          </Box>

          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="gap-2"
          >
            <NetworkAvatars
              scopes={orderedEvmScopes}
              maxVisible={maxVisibleNetworks}
              testID="musd-network-avatars"
            />
            <Icon
              name={IconName.ArrowRight}
              color={IconColor.Alternative}
              size={IconSize.Sm}
            />
          </Box>
        </Box>
      </Pressable>

      <MusdBalancesByNetworkBottomSheet
        isVisible={isBottomSheetVisible}
        onClose={handleClose}
        rows={breakdownRows}
      />
    </>
  );
};

export default MusdBalancesByNetwork;

