import React, { useMemo } from 'react';
import { CaipChainId } from '@metamask/utils';
import { ScrollView } from 'react-native-gesture-handler';

import { AvatarSize } from '../../../../../../component-library/components/Avatars/Avatar';
import AvatarNetwork from '../../../../../../component-library/components/Avatars/Avatar/variants/AvatarNetwork';
import { Box } from '../../../../Box/Box';
import { AlignItems, FlexDirection } from '../../../../Box/box.types';
import {
  Button,
  ButtonVariant,
  ButtonSize,
} from '@metamask/design-system-react-native';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../../component-library/components/Icons/Icon';

import styleSheet from './NetworksFilterBar.styles';

import { useStyles } from '../../../../../hooks/useStyles';
import { excludeFromArray } from '../../utils';
import { useTokenNetworkInfo } from '../../../hooks/useTokenNetworkInfo';
import { useTheme } from '../../../../../../util/theme';
import { strings } from '../../../../../../../locales/i18n';

interface NetworksFilterBarProps {
  networks: CaipChainId[];
  networkFilter: CaipChainId[] | null;
  setNetworkFilter: React.Dispatch<React.SetStateAction<CaipChainId[] | null>>;
  setIsEditingNetworkFilter: (isEditing: boolean) => void;
}

function NetworksFilterBar({
  networks,
  networkFilter,
  setNetworkFilter,
  setIsEditingNetworkFilter,
}: Readonly<NetworksFilterBarProps>) {
  const { styles } = useStyles(styleSheet, {});
  const { colors } = useTheme();
  const getTokenNetworkInfo = useTokenNetworkInfo();

  const allNetworksIcons = useMemo(() => {
    const headSize = 3;
    const reversedHead = networks.slice(0, headSize).reverse();
    return (
      <Box flexDirection={FlexDirection.RowReverse} gap={0}>
        {reversedHead.map((chainId) => {
          const { depositNetworkName, networkName, networkImageSource } =
            getTokenNetworkInfo(chainId);
          return (
            <AvatarNetwork
              key={chainId}
              imageSource={networkImageSource}
              name={depositNetworkName ?? networkName}
              size={AvatarSize.Xs}
              style={styles.overlappedNetworkIcon}
              includesBorder
            />
          );
        })}
      </Box>
    );
  }, [getTokenNetworkInfo, styles.overlappedNetworkIcon, networks]);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.networksContainer}
    >
      {networkFilter && networkFilter.length !== networks.length ? (
        <>
          <Button
            variant={ButtonVariant.Secondary}
            size={ButtonSize.Sm}
            onPress={() => setIsEditingNetworkFilter(true)}
          >
            <Box
              flexDirection={FlexDirection.Row}
              alignItems={AlignItems.center}
              gap={8}
            >
              <Text variant={TextVariant.BodyMD}>See all</Text>
              <Icon
                name={IconName.ArrowDown}
                size={IconSize.Xs}
                color={colors.icon.default}
              />
            </Box>
          </Button>
          {networks.map((chainId) => {
            const isSelected = networkFilter.includes(chainId);
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
                onPress={() => {
                  if (isSelected && networkFilter.length > 1) {
                    setNetworkFilter((prev) =>
                      excludeFromArray(prev || [], chainId),
                    );
                  } else {
                    setNetworkFilter([chainId]);
                  }
                }}
              >
                <Box
                  flexDirection={FlexDirection.Row}
                  alignItems={AlignItems.center}
                >
                  {isSelected && (
                    <AvatarNetwork
                      key={chainId}
                      imageSource={networkImageSource}
                      name={displayName}
                      size={AvatarSize.Xs}
                      style={styles.selectedNetworkIcon}
                    />
                  )}
                  <Text
                    color={isSelected ? TextColor.Inverse : TextColor.Default}
                  >
                    {displayName}
                  </Text>
                </Box>
              </Button>
            );
          })}
        </>
      ) : (
        <Button
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Sm}
          onPress={() => {
            setNetworkFilter(networks);
            setIsEditingNetworkFilter(true);
          }}
        >
          <Box
            flexDirection={FlexDirection.Row}
            alignItems={AlignItems.center}
            gap={8}
          >
            {allNetworksIcons}
            <Text variant={TextVariant.BodyMD}>
              {strings('deposit.networks_filter_bar.all_networks')}
            </Text>
            <Icon
              name={IconName.ArrowDown}
              size={IconSize.Xs}
              color={colors.icon.default}
            />
          </Box>
        </Button>
      )}
    </ScrollView>
  );
}

export default NetworksFilterBar;
