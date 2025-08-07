import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { CaipChainId } from '@metamask/utils';
import {
  Gesture,
  GestureDetector,
  ScrollView,
} from 'react-native-gesture-handler';

import { AvatarSize } from '../../../../../../component-library/components/Avatars/Avatar';
import AvatarNetwork from '../../../../../../component-library/components/Avatars/Avatar/variants/AvatarNetwork';
import { Box } from '../../../../Box/Box';
import { AlignItems, FlexDirection } from '../../../../Box/box.types';
import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../../../../component-library/components/Buttons/Button';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../../component-library/components/Icons/Icon';

import styleSheet from './NetworksFilterBar.styles';

import { selectNetworkConfigurationsByCaipChainId } from '../../../../../../selectors/networkController';
import { useStyles } from '../../../../../hooks/useStyles';
import { DEPOSIT_NETWORKS_BY_CHAIN_ID } from '../../constants/networks';
import { excludeFromArray } from '../../utils';
import { getNetworkImageSource } from '../../../../../../util/networks';
import { useTheme } from '../../../../../../util/theme';
import { strings } from '../../../../../../../locales/i18n';
import { noop } from 'lodash';

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

  const allNetworkConfigurations = useSelector(
    selectNetworkConfigurationsByCaipChainId,
  );

  const allNetworksIcons = useMemo(() => {
    const headSize = 3;
    const reversedHead = networks.slice(0, headSize).reverse();
    return (
      <Box flexDirection={FlexDirection.RowReverse} gap={0}>
        {reversedHead.map((chainId) => (
          <AvatarNetwork
            key={chainId}
            imageSource={getNetworkImageSource({ chainId })}
            name={allNetworkConfigurations[chainId]?.name}
            size={AvatarSize.Xs}
            style={styles.overlappedNetworkIcon}
            includesBorder
          />
        ))}
      </Box>
    );
  }, [allNetworkConfigurations, styles.overlappedNetworkIcon, networks]);

  const tapSeeAll = Gesture.Tap()
    .runOnJS(true)
    .onEnd(() => setIsEditingNetworkFilter(true));

  const tapAllNetworks = Gesture.Tap()
    .runOnJS(true)
    .onEnd(() => {
      setNetworkFilter(networks);
      setIsEditingNetworkFilter(true);
    });

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.networksContainer}
    >
      {networkFilter && networkFilter.length !== networks.length ? (
        <>
          <GestureDetector gesture={tapSeeAll}>
            <Button
              variant={ButtonVariants.Secondary}
              size={ButtonSize.Sm}
              label={
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
              }
              onPress={noop}
            />
          </GestureDetector>
          {networks.map((chainId) => {
            const isSelected = networkFilter.includes(chainId);
            const networkName =
              DEPOSIT_NETWORKS_BY_CHAIN_ID[chainId]?.name ??
              allNetworkConfigurations[chainId]?.name;
            const tap = Gesture.Tap()
              .runOnJS(true)
              .onEnd(() => {
                if (isSelected && networkFilter.length > 1) {
                  setNetworkFilter((prev) =>
                    excludeFromArray(prev || [], chainId),
                  );
                } else {
                  setNetworkFilter([chainId]);
                }
              });
            return (
              <GestureDetector key={chainId} gesture={tap}>
                <Button
                  key={chainId}
                  variant={
                    isSelected
                      ? ButtonVariants.Primary
                      : ButtonVariants.Secondary
                  }
                  size={ButtonSize.Sm}
                  label={
                    <>
                      {isSelected && (
                        <AvatarNetwork
                          key={chainId}
                          imageSource={getNetworkImageSource({ chainId })}
                          name={networkName}
                          size={AvatarSize.Xs}
                          style={styles.selectedNetworkIcon}
                        />
                      )}
                      <Text
                        color={
                          isSelected ? TextColor.Inverse : TextColor.Default
                        }
                      >
                        {networkName}
                      </Text>
                    </>
                  }
                  onPress={noop}
                />
              </GestureDetector>
            );
          })}
        </>
      ) : (
        <GestureDetector gesture={tapAllNetworks}>
          <Button
            variant={ButtonVariants.Secondary}
            size={ButtonSize.Sm}
            label={
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
            }
            onPress={noop}
          />
        </GestureDetector>
      )}
    </ScrollView>
  );
}

export default NetworksFilterBar;
