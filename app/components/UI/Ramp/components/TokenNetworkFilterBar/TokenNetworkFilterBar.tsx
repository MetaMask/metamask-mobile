import React, { useCallback } from 'react';
import { CaipChainId } from '@metamask/utils';
import { ScrollView } from 'react-native-gesture-handler';

import { AvatarSize } from '../../../../../component-library/components/Avatars/Avatar';
import AvatarNetwork from '../../../../../component-library/components/Avatars/Avatar/variants/AvatarNetwork';
import {
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

import styleSheet from './TokenNetworkFilterBar.styles';

import { useStyles } from '../../../../hooks/useStyles';
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
  const { styles } = useStyles(styleSheet, {});
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
      // Radio button behavior: always set to single selection
      setNetworkFilter([chainId]);
    },
    [setNetworkFilter],
  );

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.networksContainer}
    >
      <Button
        variant={
          isAllSelected ? ButtonVariant.Primary : ButtonVariant.Secondary
        }
        size={ButtonSize.Sm}
        onPress={handleAllPress}
      >
        <Text
          color={
            isAllSelected ? TextColor.PrimaryInverse : TextColor.TextDefault
          }
          variant={TextVariant.BodyMd}
        >
          {strings('unified_ramp.networks_filter_bar.all_networks')}
        </Text>
      </Button>
      {networks.map((chainId) => {
        const isSelected =
          !isAllSelected && (networkFilter?.includes(chainId) ?? false);
        const { depositNetworkName, networkName, networkImageSource } =
          getTokenNetworkInfo(chainId);
        const displayName = depositNetworkName ?? networkName;
        return (
          <Button
            key={chainId}
            variant={
              isSelected ? ButtonVariant.Primary : ButtonVariant.Secondary
            }
            size={ButtonSize.Sm}
            startAccessory={
              <AvatarNetwork
                imageSource={networkImageSource}
                name={displayName}
                size={AvatarSize.Xs}
              />
            }
            onPress={() => handleNetworkPress(chainId)}
          >
            <Text
              color={
                isSelected ? TextColor.PrimaryInverse : TextColor.TextDefault
              }
              variant={TextVariant.BodyMd}
            >
              {displayName}
            </Text>
          </Button>
        );
      })}
    </ScrollView>
  );
}

export default TokenNetworkFilterBar;
