import React, { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import type { CaipChainId } from '@metamask/utils';
import {
  AvatarNetwork,
  AvatarNetworkSize,
} from '@metamask/design-system-react-native';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import { strings } from '../../../../../locales/i18n';
import { selectNetworkConfigurationsByCaipChainId } from '../../../../selectors/networkController';
import { getNetworkImageSource } from '../../../../util/networks';
import { navigateWithDetails } from '../../../../util/navigation/navUtils';
import { createNetworkManagerNavDetails } from '../../NetworkManager';

/**
 * Builds the `BaseControlBar` props needed to drive its network filter button
 * from a caller-owned local (Redux-free) selection, instead of the shared
 * NetworkEnablementController state. Opens the same NetworkMultiSelector, but
 * wires selection back through `onNetworkFilterChange` rather than Redux -
 * see NetworkMultiSelector's `onLocalNetworkSelect`.
 */
export const useLocalNetworkFilterControlBarProps = (
  networkFilter: CaipChainId[] | null,
  onNetworkFilterChange: (chainIds: CaipChainId[] | null) => void,
  networkFilterTestId: string,
) => {
  const navigation = useNavigation<AppNavigationProp>();
  const networkConfigurationsByCaipChainId = useSelector(
    selectNetworkConfigurationsByCaipChainId,
  );

  const selectedChainId = networkFilter?.[0];
  const selectedNetworkName = selectedChainId
    ? networkConfigurationsByCaipChainId[selectedChainId]?.name
    : undefined;

  const networkLabel =
    selectedNetworkName ?? strings('wallet.popular_networks');
  const networkValueTestId = selectedChainId
    ? `${networkFilterTestId}-${selectedChainId}`
    : undefined;

  const networkAvatar = useMemo(() => {
    if (!selectedChainId) {
      return null;
    }
    return (
      <AvatarNetwork
        src={getNetworkImageSource({ chainId: selectedChainId })}
        size={AvatarNetworkSize.Xs}
        name={selectedNetworkName}
      />
    );
  }, [selectedChainId, selectedNetworkName]);

  const onFilterPress = useCallback(() => {
    navigateWithDetails(
      navigation,
      createNetworkManagerNavDetails({
        localSelectedChainIds: networkFilter ?? null,
        onLocalNetworkSelect: onNetworkFilterChange,
      }),
    );
  }, [navigation, networkFilter, onNetworkFilterChange]);

  return {
    onFilterPress,
    networkLabel,
    networkAvatar,
    networkValueTestId,
  };
};
