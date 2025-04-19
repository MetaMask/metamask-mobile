import React from 'react';
import { Text, View, TouchableOpacity, StyleSheet } from 'react-native';
import { strings } from '../../../../locales/i18n';
import { ImportTokenViewSelectorsIDs } from '../../../../e2e/selectors/wallet/ImportTokenView.selectors';
import { getNetworkImageSource } from '../../../util/networks';
import {
  IconColor,
  IconName,
} from '../../../component-library/components/Icons/Icon';
import Avatar, {
  AvatarSize,
  AvatarVariant,
} from '../../../component-library/components/Avatars/Avatar';
import ButtonIcon from '../../../component-library/components/Buttons/ButtonIcon';
import { fontStyles } from '../../../styles/common';
import { Theme } from '@metamask/design-tokens';
import { useTheme } from '../../../util/theme';
import { Hex } from '@metamask/utils';

const createStyles = (colors: Theme['colors']) =>
  StyleSheet.create({
    overlappingAvatarsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      position: 'absolute',
      paddingHorizontal: 16,
      right: 0,
    },
    networkSelectorContainer: {
      borderWidth: 1,
      marginBottom: 16,
      marginTop: 4,
      borderColor: colors.border.default,
      borderRadius: 2,
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
    },
    networkSelectorText: {
      ...fontStyles.normal,
      color: colors.text.default,
      fontSize: 16,
    },
  });

interface NetworkSelectorDropdownProps {
  setOpenNetworkSelector: (val: boolean) => void;
  selectedNetwork: string;
  chainId: Hex;
}

export const NetworkSelectorDropdown = ({
  setOpenNetworkSelector,
  selectedNetwork,
  chainId,
}: NetworkSelectorDropdownProps) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  return (
    <TouchableOpacity
      style={styles.networkSelectorContainer}
      onPress={() => setOpenNetworkSelector(true)}
      onLongPress={() => setOpenNetworkSelector(true)}
    >
      <Text style={styles.networkSelectorText}>
        {selectedNetwork || strings('networks.select_network')}
      </Text>
      <View style={styles.overlappingAvatarsContainer}>
        {selectedNetwork ? (
          <Avatar
            variant={AvatarVariant.Network}
            size={AvatarSize.Sm}
            name={selectedNetwork}
            imageSource={getNetworkImageSource({
              networkType: 'evm',
              chainId,
            })}
            testID={ImportTokenViewSelectorsIDs.SELECT_NETWORK_BUTTON}
          />
        ) : null}

        <ButtonIcon
          iconName={IconName.ArrowDown}
          iconColor={IconColor.Default}
          testID={ImportTokenViewSelectorsIDs.SELECT_NETWORK_BUTTON}
          onPress={() => setOpenNetworkSelector(true)}
          accessibilityRole="button"
        />
      </View>
    </TouchableOpacity>
  );
};
