import React, { useMemo } from 'react';
import { View } from 'react-native';
import {
  IconName,
  IconColor,
} from '../../../component-library/components/Icons/Icon';
import { WalletViewSelectorsIDs } from '../../Views/Wallet/WalletView.testIds';
import {
  AvatarSize,
  AvatarVariant,
} from '../../../component-library/components/Avatars/Avatar/Avatar.types';
import Avatar from '../../../component-library/components/Avatars/Avatar';
import { useStyles } from '../../../component-library/hooks';
import ButtonIcon from '../../../component-library/components/Buttons/ButtonIcon';
import stylesheet from './index.styles';
import { getNetworkImageSource } from '../../../util/networks';
import { useSelector } from 'react-redux';
import { selectNetworkImageSource } from '../../../selectors/networkInfos';

const BUTTON_TEST_ID = 'button-icon-test-id';

const NetworkImageComponent = ({
  isAllNetworksEnabled,
  allNetworksEnabled,
  selectorButtonDisplayed = true,
  onPress,
}: {
  isAllNetworksEnabled: boolean;
  allNetworksEnabled: { [key: string]: boolean };
  selectorButtonDisplayed?: boolean;
  onPress?: () => void;
}) => {
  const { styles } = useStyles(stylesheet, {});
  const networkImageSource = useSelector(selectNetworkImageSource);

  const networkContent = useMemo(() => {
    if (isAllNetworksEnabled) {
      return (
        <View style={styles.overlappingAvatarsContainer}>
          {Object.keys(allNetworksEnabled).map((networkId, index) => (
            <View
              style={[styles.avatarWrapper, { zIndex: 5 - index }]}
              key={networkId}
            >
              <Avatar
                variant={AvatarVariant.Network}
                size={AvatarSize.Sm}
                imageSource={getNetworkImageSource({
                  networkType: 'evm',
                  chainId: networkId,
                })}
                testID={WalletViewSelectorsIDs.NAVBAR_NETWORK_PICKER}
              />
            </View>
          ))}
          {selectorButtonDisplayed ? (
            <ButtonIcon
              iconName={IconName.ArrowDown}
              iconColor={IconColor.Default}
              testID={BUTTON_TEST_ID}
              accessibilityRole="button"
              onPress={onPress}
            />
          ) : null}
        </View>
      );
    }
    return (
      <View style={styles.overlappingAvatarsContainer}>
        <Avatar
          variant={AvatarVariant.Network}
          size={AvatarSize.Sm}
          imageSource={networkImageSource}
          testID={WalletViewSelectorsIDs.NAVBAR_NETWORK_PICKER}
        />
        {selectorButtonDisplayed ? (
          <ButtonIcon
            iconName={IconName.ArrowDown}
            iconColor={IconColor.Default}
            testID={BUTTON_TEST_ID}
            accessibilityRole="button"
            onPress={onPress}
          />
        ) : null}
      </View>
    );
  }, [
    isAllNetworksEnabled,
    allNetworksEnabled,
    styles,
    networkImageSource,
    selectorButtonDisplayed,
    onPress,
  ]);

  return networkContent;
};

export default NetworkImageComponent;
