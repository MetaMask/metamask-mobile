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
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../component-library/components/Badges/BadgeWrapper';
import Badge, {
  BadgeVariant,
} from '../../../../../component-library/components/Badges/Badge';
import { buildTokenIconUrl } from '../../util/buildTokenIconUrl';
import { getDefaultNetworkByChainId } from '../../../../../util/networks';
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

  const getNetworkBadgeSource = useCallback((chainId: string) => {
    if (!chainId) {
      return null;
    }
    try {
      const defaultNetwork = getDefaultNetworkByChainId(chainId) as
        | { imageSource: string }
        | undefined;
      return defaultNetwork?.imageSource;
    } catch (error) {
      return null;
    }
  }, []);

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

    const iconUrl = buildTokenIconUrl(
      selectedToken.chainId,
      selectedToken.address || '',
    );

    return (
      <View style={styles.selectedTokenContainer}>
        <BadgeWrapper
          style={styles.selectedTokenBadge}
          badgePosition={BadgePosition.BottomRight}
          badgeElement={
            getNetworkBadgeSource(selectedToken.chainId) ? (
              <Badge
                variant={BadgeVariant.Network}
                imageSource={{
                  uri: getNetworkBadgeSource(selectedToken.chainId) || '',
                }}
              />
            ) : null
          }
        >
          <AvatarToken
            name={selectedToken.symbol || ''}
            imageSource={iconUrl ? { uri: iconUrl } : undefined}
            size={AvatarSize.Md}
          />
        </BadgeWrapper>
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
