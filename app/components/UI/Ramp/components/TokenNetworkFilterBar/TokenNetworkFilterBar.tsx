import React, { useCallback } from 'react';
import { CaipChainId } from '@metamask/utils';
import { ScrollView } from 'react-native-gesture-handler';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  AvatarBaseShape,
  AvatarNetwork,
  AvatarNetworkSize,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

import ButtonToggle from '../../../../../component-library/components-temp/Buttons/ButtonToggle';
import { ButtonSize } from '../../../../../component-library/components/Buttons/Button';

import { useTokenNetworkInfo } from '../../hooks/useTokenNetworkInfo';
import { strings } from '../../../../../../locales/i18n';

interface TokenNetworkFilterBarProps {
  networks: CaipChainId[];
  networkFilter: CaipChainId[] | null;
  setNetworkFilter: (filter: CaipChainId[] | null) => void;
}

function TokenNetworkFilterBar({
  networks,
  networkFilter,
  setNetworkFilter,
}: Readonly<TokenNetworkFilterBarProps>) {
  const tw = useTailwind();
  const getTokenNetworkInfo = useTokenNetworkInfo();

  const isAllSelected =
    !networkFilter ||
    networkFilter.length === 0 ||
    networkFilter.length === networks.length;

  const handleAllPress = useCallback(() => {
    setNetworkFilter(null);
  }, [setNetworkFilter]);

  const handleNetworkPress = useCallback(
    (chainId: CaipChainId) => {
      setNetworkFilter([chainId]);
    },
    [setNetworkFilter],
  );

  const allNetworksLabel = strings(
    'unified_ramp.networks_filter_bar.all_networks',
  );

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={tw.style('flex-row items-center gap-2')}
      style={tw.style('flex-grow-0')}
    >
      <ButtonToggle
        label={allNetworksLabel}
        isActive={isAllSelected}
        onPress={handleAllPress}
        size={ButtonSize.Md}
        style={tw.style('rounded-xl py-2 px-3')}
        accessibilityLabel={allNetworksLabel}
      />
      {networks.map((chainId) => {
        const isSelected =
          !isAllSelected && (networkFilter?.includes(chainId) ?? false);
        const { depositNetworkName, networkName, networkImageSource } =
          getTokenNetworkInfo(chainId);
        const displayName = depositNetworkName ?? networkName;
        return (
          <ButtonToggle
            key={chainId}
            label={
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                gap={2}
              >
                <AvatarNetwork
                  src={
                    networkImageSource as React.ComponentProps<
                      typeof AvatarNetwork
                    >['src']
                  }
                  size={AvatarNetworkSize.Xs}
                  name={displayName}
                  shape={AvatarBaseShape.Square}
                  twClassName="rounded translate-y-px"
                />
                <Text
                  variant={TextVariant.BodyMd}
                  fontWeight={FontWeight.Medium}
                  color={
                    isSelected
                      ? TextColor.PrimaryInverse
                      : TextColor.TextDefault
                  }
                >
                  {displayName}
                </Text>
              </Box>
            }
            isActive={isSelected}
            onPress={() => handleNetworkPress(chainId)}
            size={ButtonSize.Md}
            style={tw.style('rounded-xl py-2 px-3')}
            accessibilityLabel={displayName}
          />
        );
      })}
    </ScrollView>
  );
}

export default TokenNetworkFilterBar;
