import React from 'react';
import { useSelector } from 'react-redux';
import { CaipChainId } from '@metamask/utils';
import { ScrollView } from 'react-native-gesture-handler';

import { AvatarSize } from '../../../../../component-library/components/Avatars/Avatar';
import AvatarNetwork from '../../../../../component-library/components/Avatars/Avatar/variants/AvatarNetwork';
import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';

import styleSheet from './TokenNetworkFilterBar.styles';

import { selectNetworkConfigurationsByCaipChainId } from '../../../../../selectors/networkController';
import { useStyles } from '../../../../hooks/useStyles';
import { DEPOSIT_NETWORKS_BY_CHAIN_ID } from '../../Deposit/constants/networks';
import { excludeFromArray } from '../../Deposit/utils';
import { getNetworkImageSource } from '../../../../../util/networks';
import { strings } from '../../../../../../locales/i18n';

interface TokenNetworkFilterBarProps {
  networks: CaipChainId[];
  networkFilter: CaipChainId[] | null;
  setNetworkFilter: React.Dispatch<React.SetStateAction<CaipChainId[] | null>>;
}

function TokenNetworkFilterBar({
  networks,
  networkFilter,
  setNetworkFilter,
}: Readonly<TokenNetworkFilterBarProps>) {
  const { styles } = useStyles(styleSheet, {});

  const allNetworkConfigurations = useSelector(
    selectNetworkConfigurationsByCaipChainId,
  );

  const isAllSelected =
    !networkFilter ||
    networkFilter.length === 0 ||
    networkFilter.length === networks.length;

  const handleAllPress = () => {
    setNetworkFilter(null);
  };

  const handleNetworkPress = (chainId: CaipChainId) => {
    if (isAllSelected) {
      setNetworkFilter([chainId]);
      return;
    }

    const currentFilter = networkFilter || [];
    const isSelected = currentFilter.includes(chainId);

    if (isSelected) {
      const newFilter = excludeFromArray(currentFilter, chainId);
      setNetworkFilter(newFilter.length === networks.length ? null : newFilter);
    } else {
      const newFilter = [...currentFilter, chainId];
      setNetworkFilter(newFilter.length === networks.length ? null : newFilter);
    }
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.networksContainer}
    >
      <Button
        variant={
          isAllSelected ? ButtonVariants.Primary : ButtonVariants.Secondary
        }
        size={ButtonSize.Sm}
        label={
          <Text
            color={isAllSelected ? TextColor.Inverse : TextColor.Default}
            variant={TextVariant.BodyMD}
          >
            {strings('deposit.unified_ramp.networks_filter_bar.all_networks')}
          </Text>
        }
        onPress={handleAllPress}
      />
      {networks.map((chainId) => {
        const isSelected =
          !isAllSelected && (networkFilter?.includes(chainId) ?? false);
        const networkName =
          DEPOSIT_NETWORKS_BY_CHAIN_ID[chainId]?.name ??
          allNetworkConfigurations[chainId]?.name;
        return (
          <Button
            key={chainId}
            variant={
              isSelected ? ButtonVariants.Primary : ButtonVariants.Secondary
            }
            size={ButtonSize.Sm}
            label={
              <>
                <AvatarNetwork
                  imageSource={getNetworkImageSource({ chainId })}
                  name={networkName}
                  size={AvatarSize.Xs}
                  style={styles.selectedNetworkIcon}
                />

                <Text
                  color={isSelected ? TextColor.Inverse : TextColor.Default}
                  variant={TextVariant.BodyMD}
                >
                  {networkName}
                </Text>
              </>
            }
            onPress={() => handleNetworkPress(chainId)}
          />
        );
      })}
    </ScrollView>
  );
}

export default TokenNetworkFilterBar;
