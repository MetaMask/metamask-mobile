import { CaipChainId } from '@metamask/utils';
import React, { useCallback } from 'react';
import { View, useWindowDimensions } from 'react-native';
import { FlatList } from 'react-native-gesture-handler';

import styleSheet from './NetworksFilterSelector.styles';

import AvatarNetwork from '../../../../../../component-library/components/Avatars/Avatar/variants/AvatarNetwork';
import { AvatarSize } from '../../../../../../component-library/components/Avatars/Avatar';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../../component-library/components/Buttons/Button';
import Checkbox from '../../../../../../component-library/components/Checkbox';
import ListItemColumn, {
  WidthType,
} from '../../../../../../component-library/components/List/ListItemColumn';
import ListItemSelect from '../../../../../../component-library/components/List/ListItemSelect';
import Text, {
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';

import { useStyles } from '../../../../../hooks/useStyles';
import { strings } from '../../../../../../../locales/i18n';
import { useTokenNetworkInfo } from '../../../hooks/useTokenNetworkInfo';
import { excludeFromArray } from '../../utils';

interface NetworksFilterSelectorProps {
  networks: CaipChainId[];
  networkFilter: CaipChainId[] | null;
  setNetworkFilter: React.Dispatch<React.SetStateAction<CaipChainId[] | null>>;
  setIsEditingNetworkFilter: (isEditing: boolean) => void;
}
function NetworksFilterSelector({
  networks,
  networkFilter,
  setNetworkFilter,
  setIsEditingNetworkFilter,
}: Readonly<NetworksFilterSelectorProps>) {
  const { height: screenHeight } = useWindowDimensions();

  const { styles } = useStyles(styleSheet, {
    screenHeight,
  });

  const getTokenNetworkInfo = useTokenNetworkInfo();

  const handleNetworkOnPress = useCallback(
    (chainId: CaipChainId) => () => {
      setNetworkFilter((prev) =>
        prev?.includes(chainId)
          ? excludeFromArray(prev, chainId)
          : [...(prev || []), chainId],
      );
    },
    [setNetworkFilter],
  );
  return (
    <>
      <Button
        variant={ButtonVariants.Link}
        size={ButtonSize.Sm}
        label={
          networks.length === networkFilter?.length
            ? strings('deposit.networks_filter_selector.deselect_all')
            : strings('deposit.networks_filter_selector.select_all')
        }
        onPress={() => {
          setNetworkFilter(
            networks.length === networkFilter?.length ? [] : networks,
          );
        }}
      />
      <FlatList
        style={styles.list}
        data={networks}
        renderItem={({ item: chainId }) => {
          const { depositNetworkName, networkName, networkImageSource } =
            getTokenNetworkInfo(chainId);
          const displayName = depositNetworkName ?? networkName;
          return (
            <ListItemSelect onPress={handleNetworkOnPress(chainId)}>
              <ListItemColumn>
                <Checkbox
                  isChecked={networkFilter?.includes(chainId) ?? false}
                  onPress={handleNetworkOnPress(chainId)}
                />
              </ListItemColumn>
              <ListItemColumn>
                <AvatarNetwork
                  name={displayName}
                  imageSource={networkImageSource}
                  size={AvatarSize.Md}
                />
              </ListItemColumn>
              <ListItemColumn widthType={WidthType.Fill}>
                <Text variant={TextVariant.BodyMD}>{displayName}</Text>
              </ListItemColumn>
            </ListItemSelect>
          );
        }}
        keyExtractor={(item) => item}
      ></FlatList>
      <View style={styles.buttonContainer}>
        <Button
          variant={ButtonVariants.Primary}
          size={ButtonSize.Lg}
          width={ButtonWidthTypes.Full}
          label={strings('deposit.networks_filter_selector.apply')}
          onPress={() => {
            if (
              networkFilter?.length === networks.length ||
              networkFilter?.length === 0
            ) {
              setNetworkFilter(null);
            }
            setIsEditingNetworkFilter(false);
          }}
        />
      </View>
    </>
  );
}

export default NetworksFilterSelector;
