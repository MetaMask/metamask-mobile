import React, { useCallback, useMemo } from 'react';
import { FlatList, TouchableOpacity, View, ScrollView } from 'react-native';
import Modal from 'react-native-modal';
import { AvatarSize } from '../../../../../component-library/components/Avatars/Avatar';
import AvatarToken from '../../../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import Badge, {
  BadgeVariant,
} from '../../../../../component-library/components/Badges/Badge';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../component-library/components/Badges/BadgeWrapper';
import ButtonIcon from '../../../../../component-library/components/Buttons/ButtonIcon';
import {
  IconColor,
  IconName,
} from '../../../../../component-library/components/Icons/Icon';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { getDefaultNetworkByChainId, getNetworkImageSource } from '../../../../../util/networks';
import { renderFromTokenMinimalUnit } from '../../../../../util/number';
import { useTheme } from '../../../../../util/theme';
import type { BridgeToken } from '../../../Bridge/types';
import { createStyles } from './PerpsTokenSelector.styles';

// Re-export BridgeToken as PerpsToken for backward compatibility
export type PerpsToken = BridgeToken;

// Interface for network object returned by getDefaultNetworkByChainId
interface NetworkInfo {
  name: string;
  chainId: string;
  networkType: string;
  shortName?: string;
  ticker?: string;
  color?: string;
  imageSource?: unknown;
}

interface PerpsTokenSelectorProps {
  isVisible: boolean;
  onClose: () => void;
  onTokenSelect: (token: PerpsToken) => void;
  tokens: PerpsToken[];
  selectedTokenAddress?: string;
  selectedTokenChainId?: string;
  title?: string;
  minimumBalance?: number;
}


const PerpsTokenSelector: React.FC<PerpsTokenSelectorProps> = ({
  isVisible,
  onClose,
  onTokenSelect,
  tokens,
  selectedTokenAddress,
  selectedTokenChainId,
  title = 'Select Token',
  minimumBalance = 0,
}) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  // State for selected networks
  const [selectedNetworks, setSelectedNetworks] = React.useState<Set<string>>(new Set());

  // Get unique networks from tokens
  const availableNetworks = useMemo(() => {
    const networksMap = new Map<string, { chainId: string; name: string; count: number }>();

    tokens.forEach(token => {
      const tokenBalance = parseFloat(token.balance || '0');
      if (token.chainId && tokenBalance >= minimumBalance) {
        const network = getDefaultNetworkByChainId(String(token.chainId)) as NetworkInfo | undefined;
        const networkName = network?.name || 'Unknown';

        if (networksMap.has(token.chainId)) {
          const existing = networksMap.get(token.chainId);
          if (existing) {
            existing.count += 1;
          }
        } else {
          networksMap.set(token.chainId, {
            chainId: token.chainId,
            name: networkName,
            count: 1,
          });
        }
      }
    });

    return Array.from(networksMap.values()).sort((a, b) => {
      // Sort Arbitrum first
      if (a.chainId === '0xa4b1') return -1;
      if (b.chainId === '0xa4b1') return 1;
      // Then by count
      return b.count - a.count;
    });
  }, [tokens, minimumBalance]);

  // Initialize selected networks with all available networks
  React.useEffect(() => {
    if (availableNetworks.length > 0 && selectedNetworks.size === 0) {
      setSelectedNetworks(new Set(availableNetworks.map(n => n.chainId)));
    }
  }, [availableNetworks, selectedNetworks.size]);

  // Show all tokens with balances, prioritizing USDC on Arbitrum
  const supportedTokens = useMemo(() => {
    // Filter tokens that have balances and add network information
    const tokensWithBalances = tokens.filter(token => {
      const tokenBalance = parseFloat(token.balance || '0');
      const hasMinimumBalance = tokenBalance >= minimumBalance;
      const isInSelectedNetwork = selectedNetworks.size === 0 || selectedNetworks.has(token.chainId);
      return hasMinimumBalance && isInSelectedNetwork;
    });

    // Sort by preference: USDC on Arbitrum first, then other USDC, then others
    return tokensWithBalances.sort((a, b) => {
      // Priority 1: USDC on Arbitrum (0xa4b1)
      if (a.symbol === 'USDC' && a.chainId === '0xa4b1') return -1;
      if (b.symbol === 'USDC' && b.chainId === '0xa4b1') return 1;

      // Priority 2: Other USDC tokens
      if (a.symbol === 'USDC') return -1;
      if (b.symbol === 'USDC') return 1;

      // Priority 3: Sort by balance (highest first)
      const aBalance = parseFloat(a.balance || '0');
      const bBalance = parseFloat(b.balance || '0');
      return bBalance - aBalance;
    });
  }, [tokens, selectedNetworks, minimumBalance]);

  const handleTokenPress = useCallback((token: PerpsToken) => {
    onTokenSelect(token);
  }, [onTokenSelect]);

  const handleNetworkToggle = useCallback((chainId: string) => {
    setSelectedNetworks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(chainId)) {
        // Don't allow deselecting if it's the last network
        if (newSet.size > 1) {
          newSet.delete(chainId);
        }
      } else {
        newSet.add(chainId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAllNetworks = useCallback(() => {
    setSelectedNetworks(new Set(availableNetworks.map(n => n.chainId)));
  }, [availableNetworks]);

  const renderTokenItem = useCallback(({ item, index }: { item: PerpsToken; index: number }) => {
    // Case-insensitive address comparison to handle checksum differences
    const isSelected = item.address.toLowerCase() === selectedTokenAddress?.toLowerCase() &&
      item.chainId === selectedTokenChainId;
    const isLast = index === supportedTokens.length - 1;


    return (
      <TouchableOpacity
        style={[styles.tokenItem, isLast && styles.lastTokenItem]}
        onPress={() => handleTokenPress(item)}
        testID={`token-${item.symbol}`}
      >
        <View style={styles.tokenIcon}>
          <BadgeWrapper
            badgePosition={BadgePosition.BottomRight}
            badgeElement={
              item.chainId ? (
                <Badge
                  imageSource={getNetworkImageSource({
                    chainId: item.chainId,
                  })}
                  name={(() => {
                    const network = getDefaultNetworkByChainId(String(item.chainId)) as NetworkInfo | undefined;
                    return network?.name || 'Unknown';
                  })()}
                  variant={BadgeVariant.Network}
                />
              ) : null
            }
          >
            <AvatarToken
              imageSource={item.image ? { uri: item.image } : undefined}
              name={item.symbol}
              size={AvatarSize.Md}
            />
          </BadgeWrapper>
        </View>

        <View style={styles.tokenInfo}>
          <View style={styles.tokenTitleRow}>
            <Text
              variant={TextVariant.BodyMDMedium}
              style={styles.tokenSymbol}
              testID={`token-symbol-${item.symbol}`}
            >
              {item.symbol}
            </Text>
          </View>
          {item.name && (
            <Text
              variant={TextVariant.BodySM}
              color={TextColor.Muted}
              style={styles.tokenName}
              testID={`token-name-${item.symbol}`}
            >
              {item.name}
            </Text>
          )}
        </View>

        <View style={styles.tokenBalance}>
          {item.balance && (
            <Text
              variant={TextVariant.BodyMD}
              testID={`token-balance-${item.symbol}`}
            >
              {renderFromTokenMinimalUnit(item.balance, item.decimals)}
            </Text>
          )}
          {item.balanceFiat && (
            <Text
              variant={TextVariant.BodySM}
              color={TextColor.Muted}
              testID={`token-fiat-${item.symbol}`}
            >
              {item.balanceFiat}
            </Text>
          )}
        </View>

        {isSelected && (
          <View style={styles.selectedIndicator}>
            <ButtonIcon
              iconName={IconName.Confirmation}
              iconColor={IconColor.Inverse}
            />
          </View>
        )}
      </TouchableOpacity>
    );
  }, [selectedTokenAddress, selectedTokenChainId, supportedTokens.length, styles, handleTokenPress]);

  return (
    <Modal
      isVisible={isVisible}
      onBackdropPress={onClose}
      onBackButtonPress={onClose}
      style={styles.modal}
      propagateSwipe
      swipeDirection="down"
      onSwipeComplete={onClose}
      testID="perps-token-selector-modal"
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.placeholder} />
          <Text
            variant={TextVariant.HeadingMD}
            style={styles.headerTitle}
            testID="token-selector-title"
          >
            {title}
          </Text>
          <ButtonIcon
            iconName={IconName.Close}
            onPress={onClose}
            iconColor={IconColor.Default}
            style={styles.closeButton}
            testID="close-token-selector"
          />
        </View>

        {/* Network Filter Bar */}
        {availableNetworks.length > 1 && (
          <View style={styles.networkFilterContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.networkFilterScroll}
              contentContainerStyle={styles.networkFilterContent}
            >
              {availableNetworks.map((network) => {
                const isSelected = selectedNetworks.has(network.chainId);
                return (
                  <TouchableOpacity
                    key={network.chainId}
                    style={[
                      styles.networkFilterChip,
                      isSelected && styles.networkFilterChipSelected,
                    ]}
                    onPress={() => handleNetworkToggle(network.chainId)}
                    testID={`network-filter-${network.chainId}`}
                  >
                    <Badge
                      imageSource={getNetworkImageSource({ chainId: network.chainId })}
                      name={network.name}
                      variant={BadgeVariant.Network}
                    />
                    <Text
                      variant={TextVariant.BodySM}
                      color={isSelected ? TextColor.Primary : TextColor.Muted}
                      style={styles.networkFilterText}
                    >
                      {network.name} ({network.count})
                    </Text>
                  </TouchableOpacity>
                );
              })}
              {selectedNetworks.size < availableNetworks.length && (
                <TouchableOpacity
                  style={styles.networkFilterChip}
                  onPress={handleSelectAllNetworks}
                  testID="network-filter-all"
                >
                  <Text
                    variant={TextVariant.BodySM}
                    color={TextColor.Primary}
                    style={styles.networkFilterText}
                  >
                    Select All
                  </Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        )}

        {/* Token List */}
        {supportedTokens.length > 0 ? (
          <FlatList
            data={supportedTokens}
            renderItem={renderTokenItem}
            keyExtractor={item => item.address}
            style={styles.tokenList}
            showsVerticalScrollIndicator={false}
            testID="token-list"
          />
        ) : (
          <View style={styles.emptyState}>
            <Text
              variant={TextVariant.BodyMD}
              color={TextColor.Muted}
              testID="no-tokens-message"
            >
              No supported tokens available
            </Text>
          </View>
        )}
      </View>
    </Modal>
  );
};

export default PerpsTokenSelector;
