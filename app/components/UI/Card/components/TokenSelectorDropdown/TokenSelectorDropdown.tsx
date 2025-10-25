import React, { useState, useCallback } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useTheme } from '../../../../../util/theme';
import { SupportedTokenWithChain } from '../../hooks/useSupportedTokens';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import AvatarToken from '../../../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import { AvatarSize } from '../../../../../component-library/components/Avatars/Avatar';
import { buildTokenIconUrl } from '../../util/buildTokenIconUrl';
import createStyles from './TokenSelectorDropdown.styles';
import TokenSelectionBottomSheet from '../TokenSelectionBottomSheet/TokenSelectionBottomSheet';

interface TokenSelectorDropdownProps {
  selectedToken: SupportedTokenWithChain | null;
  onTokenSelect: (token: SupportedTokenWithChain) => void;
  disabled?: boolean;
}

const TokenSelectorDropdown: React.FC<TokenSelectorDropdownProps> = ({
  selectedToken,
  onTokenSelect,
  disabled = false,
}) => {
  const theme = useTheme();
  const styles = createStyles(theme);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);

  const handleTokenPress = useCallback(
    (token: SupportedTokenWithChain) => {
      onTokenSelect(token);
      setIsBottomSheetOpen(false);
    },
    [onTokenSelect],
  );

  const renderSelectedToken = () => {
    if (!selectedToken) {
      return (
        <View style={styles.selectedTokenContainer}>
          <Text variant={TextVariant.BodyMD} style={styles.placeholderText}>
            Select token
          </Text>
          <Icon name={IconName.ArrowDown} size={IconSize.Sm} />
        </View>
      );
    }

    // Convert CAIP chain ID to hex format for buildTokenIconUrl
    const hexChainId = selectedToken.chainId.startsWith('eip155:')
      ? `0x${parseInt(
          selectedToken.chainId.replace('eip155:', ''),
          10,
        ).toString(16)}`
      : selectedToken.chainId;

    const iconUrl = buildTokenIconUrl(hexChainId, selectedToken.address || '');

    return (
      <View style={styles.selectedTokenContainer}>
        <AvatarToken
          name={selectedToken.symbol || ''}
          imageSource={iconUrl ? { uri: iconUrl } : undefined}
          size={AvatarSize.Md}
          style={styles.selectedTokenIcon}
        />
        <View style={styles.selectedTokenInfo}>
          <Text variant={TextVariant.BodyMD} style={styles.selectedTokenSymbol}>
            {selectedToken.symbol}
          </Text>
          <Text variant={TextVariant.BodySM} style={styles.selectedChainName}>
            {selectedToken.chainName}
          </Text>
        </View>
        <Icon name={IconName.ArrowDown} size={IconSize.Sm} />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.dropdownButton, disabled && styles.disabledButton]}
        onPress={() => setIsBottomSheetOpen(true)}
        disabled={disabled}
      >
        {renderSelectedToken()}
      </TouchableOpacity>

      <TokenSelectionBottomSheet
        isVisible={isBottomSheetOpen}
        onClose={() => setIsBottomSheetOpen(false)}
        selectedToken={selectedToken}
        onTokenSelect={handleTokenPress}
      />
    </View>
  );
};

export default TokenSelectorDropdown;
